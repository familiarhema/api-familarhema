import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ministry } from '../entities/ministry.entity';
import { MinistryResponseDto } from './dto/ministry-response.dto';
import { PCSIntegrationService } from '../integrations/pcs/pcs-integration.service';
import { VolunteerMinistrySeason } from '../entities/volunteer-ministry-season.entity';
import { Volunteer } from '../entities/volunteer.entity';
import { VolunteersService } from '../volunteers/volunteers.service';

@Injectable()
export class MinistriesService {
  private readonly logger = new Logger(MinistriesService.name);

  constructor(
    @InjectRepository(Ministry)
    private ministriesRepository: Repository<Ministry>,
    private pcsIntegrationService: PCSIntegrationService,
    private volunteersService: VolunteersService,
  ) {}

  async getActive(): Promise<MinistryResponseDto[]> {
    const ministries = await this.ministriesRepository.find({
      select: ['id', 'name', 'description', 'hearing', 'hideNewVolunteer', 'onlyIndicatin', 'block_new_registration', 'team_id'],
      where: { active: true },
      order: { name: 'ASC' },
    });

    return ministries.map(ministry => ({
      id: ministry.id,
      name: ministry.name,
      description: ministry.description,
      hearing: ministry.hearing,
      hideNewVolunteer: ministry.hideNewVolunteer,
      onlyIndicatin: ministry.onlyIndicatin,
      block_new_registration: ministry.block_new_registration,
      team_id: ministry.team_id ?? null,
    }));
  }

  async getTeamId(ministryId: number): Promise<string | null> {
    const ministry = await this.ministriesRepository.findOne({
      where: { id: ministryId },
      select: ['team_id'],
    });
    return ministry?.team_id || null;
  }

  async processNotRegisteredVolunteers(ministryId: number, seasonId: string): Promise<{ message: string }> {
    // 1. Buscar team_id do ministry
    const teamId = await this.getTeamId(ministryId);
    if (!teamId) {
      throw new Error('Ministry not found or has no team_id');
    }

    // 2. Buscar ministérios ativos
    const activeMinistries = await this.ministriesRepository.find({
      where: { active: true },
      select: ['id'],
    });
    const activeMinistryIds = activeMinistries.map(m => m.id.toString());

    // 3. Buscar voluntários da temporada para o ministry com status 'Integrated'
    const integratedVolunteers = await this.ministriesRepository.manager
      .createQueryBuilder(VolunteerMinistrySeason, 'vms')
      .innerJoin('vms.volunteer', 'v')
      .where('vms.ministry_id = :ministryId', { ministryId })
      .andWhere('vms.season_id = :seasonId', { seasonId })
      .andWhere('vms.status = :status', { status: 'Integrated' })
      .select('v.personId')
      .getRawMany();

    const integratedPersonIds = new Set(integratedVolunteers.map(v => v.v_person_id).filter(id => id !== null));

    // 4. Chamar buscarVoluntarios
    const teamVolunteers = await this.pcsIntegrationService.buscarVoluntarios(teamId);

    // 5. Filtrar pessoas não registradas
    const notRegistered = teamVolunteers.filter(person => !integratedPersonIds.has(Number(person.id)));

    // 6. Para cada, atualizar ministérios
    for (const person of notRegistered) {
      const matchingTags = person.tags.filter(tag => activeMinistryIds.includes(tag) && tag !== ministryId.toString());
      await this.pcsIntegrationService.atualizarMinisterios(person.id, matchingTags);
    }

    return { message: `Processed ${notRegistered.length} not registered volunteers` };
  }

  async syncVolunteersWithPCS(ministryId: number, seasonId: string): Promise<{
    message: string;
    total_aprovados: number;
    integrados: number;
    removidos: number;
    erros: { volunteerId: string; nome: string; etapa: string; erro: string }[];
  }> {
    this.logger.debug(`[sync] Iniciando sincronização - ministryId=${ministryId}, seasonId=${seasonId}`);

    // 1. Buscar ministério e seu team_id
    const ministry = await this.ministriesRepository.findOne({
      where: { id: ministryId },
      select: ['id', 'team_id'],
    });
    if (!ministry?.team_id) {
      this.logger.debug(`[sync] Ministério ${ministryId} não encontrado ou sem team_id`);
      throw new NotFoundException('Ministério não encontrado ou sem team_id configurado');
    }
    this.logger.debug(`[sync] team_id encontrado: ${ministry.team_id}`);

    const erros: { volunteerId: string; nome: string; etapa: string; erro: string }[] = [];
    let integrados = 0;
    let removidos = 0;

    // 2. Buscar membros atuais do time no PCS
    this.logger.debug(`[sync] Buscando membros do time PCS para team_id=${ministry.team_id}`);
    const pcsTeamMembers = await this.pcsIntegrationService.buscarVoluntarios(ministry.team_id);
    const pcsPersonIdToMember = new Map(pcsTeamMembers.map(m => [Number(m.id), m]));
    this.logger.debug(`[sync] ${pcsTeamMembers.length} membro(s) encontrado(s) no time PCS`);

    // 3. Buscar voluntários aprovados na temporada para este ministério
    this.logger.debug(`[sync] Buscando aprovados no DB para ministryId=${ministryId}, seasonId=${seasonId}`);
    const approvedRecords = await this.ministriesRepository.manager
      .createQueryBuilder(VolunteerMinistrySeason, 'vms')
      .innerJoinAndSelect('vms.volunteer', 'v')
      .where('vms.ministry_id = :ministryId', { ministryId })
      .andWhere('vms.season_id = :seasonId', { seasonId })
      .andWhere('vms.status IN (:...statuses)', { statuses: ['Accepted', 'Integrated'] })
      .getMany();
    this.logger.debug(`[sync] ${approvedRecords.length} voluntário(s) aprovado(s) encontrado(s) no DB`);

    const approvedPersonIds = new Set(
      approvedRecords.filter(r => r.volunteer.personId).map(r => r.volunteer.personId),
    );

    // Caso A: já está no time PCS E está aprovado na temporada → marcar Integrated apenas no DB
    const approvedInPcs = approvedRecords.filter(
      r => r.volunteer.personId && pcsPersonIdToMember.has(r.volunteer.personId) && r.status !== 'Integrated',
    );
    this.logger.debug(`[sync] Caso A: ${approvedInPcs.length} voluntário(s) já no time PCS e aprovados → marcar Integrated no DB`);
    for (const record of approvedInPcs) {
      this.logger.debug(`[sync] Caso A - marcando Integrated: volunteerId=${record.volunteer.id}, nome=${record.volunteer.name}`);
      try {
        record.status = 'Integrated';
        await this.ministriesRepository.manager.save(VolunteerMinistrySeason, record);
        integrados++;
        this.logger.debug(`[sync] Caso A - Integrated salvo com sucesso: volunteerId=${record.volunteer.id}`);
      } catch (e) {
        this.logger.debug(`[sync] Caso A - erro ao marcar Integrated: volunteerId=${record.volunteer.id}, erro=${e.message}`);
        erros.push({
          volunteerId: record.volunteer.id,
          nome: record.volunteer.name,
          etapa: 'marcar-integrado',
          erro: e.message,
        });
      }
    }

    // Caso B: está no time PCS mas NÃO está aprovado na temporada → remover do time
    const activeMinistryIds = (await this.ministriesRepository.find({
      where: { active: true },
      select: ['id'],
    })).map(m => m.id.toString());

    const membersToRemove = pcsTeamMembers.filter(m => !approvedPersonIds.has(Number(m.id)));
    this.logger.debug(`[sync] Caso B: ${membersToRemove.length} membro(s) no PCS sem aprovação → remover do time`);
    for (const pcsMember of pcsTeamMembers) {
      if (!approvedPersonIds.has(Number(pcsMember.id))) {
        this.logger.debug(`[sync] Caso B - removendo do time: personId=${pcsMember.id}, nome=${pcsMember.name}`);
        try {
          const remainingTags = pcsMember.tags.filter(
            tag => activeMinistryIds.includes(tag) && tag !== ministryId.toString(),
          );
          this.logger.debug(`[sync] Caso B - tags restantes após remoção: [${remainingTags.join(', ')}]`);
          await this.pcsIntegrationService.atualizarMinisterios(pcsMember.id, remainingTags);
          removidos++;
          this.logger.debug(`[sync] Caso B - removido com sucesso: personId=${pcsMember.id}`);
        } catch (e) {
          this.logger.debug(`[sync] Caso B - erro ao remover: personId=${pcsMember.id}, erro=${e.message}`);
          erros.push({
            volunteerId: pcsMember.id,
            nome: pcsMember.name,
            etapa: 'remover-do-time',
            erro: e.message,
          });
        }
      }
    }

    // Casos B1/B2: aprovados mas NÃO estão no time PCS → integrar (ignora já Integrated)
    const approvedNotInPcs = approvedRecords.filter(
      r => r.status !== 'Integrated' && (!r.volunteer.personId || !pcsPersonIdToMember.has(r.volunteer.personId)),
    );
    this.logger.debug(`[sync] Casos B1/B2: ${approvedNotInPcs.length} voluntário(s) aprovados mas não estão no time PCS → integrar`);
    for (const record of approvedNotInPcs) {
      const { id: volunteerId, name: nome } = record.volunteer;
      const temPersonId = !!record.volunteer.personId;
      this.logger.debug(`[sync] ${temPersonId ? 'Caso B1' : 'Caso B2'} - volunteerId=${volunteerId}, nome=${nome}, personId=${record.volunteer.personId ?? 'ausente'}`);
      try {
        if (!record.volunteer.personId) {
          // B2: sem personId → cadastrar no PCS primeiro
          this.logger.debug(`[sync] Caso B2 - chamando integratePerson: volunteerId=${volunteerId}`);
          await this.volunteersService.integratePerson(volunteerId, seasonId);
          this.logger.debug(`[sync] Caso B2 - integratePerson concluído: volunteerId=${volunteerId}`);
        } else {
          // B1: tem personId → verificar se está arquivado no PCS Services
          this.logger.debug(`[sync] Caso B1 - verificando status no PCS Services: personId=${record.volunteer.personId}`);
          const pessoaServices = await this.pcsIntegrationService.buscarPessoaServices(record.volunteer.personId.toString());
          if (pessoaServices?.archived) {
            this.logger.debug(`[sync] Caso B1 - pessoa arquivada, desarquivando: personId=${record.volunteer.personId}`);
            await this.pcsIntegrationService.desarquivarPessoa(record.volunteer.personId.toString());
            this.logger.debug(`[sync] Caso B1 - deserquivamento concluído: personId=${record.volunteer.personId}`);
          } else {
            this.logger.debug(`[sync] Caso B1 - pessoa não arquivada, seguindo para integrateMinistries: personId=${record.volunteer.personId}`);
          }
        }
        // B1 + B2 (após integratePerson): atribuir ministérios e marcar Integrated
        this.logger.debug(`[sync] ${temPersonId ? 'Caso B1' : 'Caso B2'} - chamando integrateMinistries: volunteerId=${volunteerId}`);
        await this.volunteersService.integrateMinistries(volunteerId, seasonId);
        integrados++;
        this.logger.debug(`[sync] ${temPersonId ? 'Caso B1' : 'Caso B2'} - integrateMinistries concluído: volunteerId=${volunteerId}`);
      } catch (e) {
        this.logger.debug(`[sync] ${temPersonId ? 'Caso B1' : 'Caso B2'} - erro: volunteerId=${volunteerId}, etapa=${temPersonId ? 'integrar-ministerios' : 'integrar-pessoa'}, erro=${e.message}`);
        erros.push({
          volunteerId,
          nome,
          etapa: record.volunteer.personId ? 'integrar-ministerios' : 'integrar-pessoa',
          erro: e.message,
        });
      }
    }

    this.logger.debug(`[sync] Sincronização concluída - total_aprovados=${approvedRecords.length}, integrados=${integrados}, removidos=${removidos}, erros=${erros.length}`);
    this.logger.debug(`[sync] Detalhes dos erros: ${JSON.stringify(erros)}`);
    return {
      message: 'Sincronização concluída',
      total_aprovados: approvedRecords.length,
      integrados,
      removidos,
      erros,
    };
  }
}