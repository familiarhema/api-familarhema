import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, LessThanOrEqual, MoreThanOrEqual, In, Like } from 'typeorm';
import { Volunteer } from '../entities/volunteer.entity';
import { PCSIntegrationService } from '../integrations/pcs/pcs-integration.service';
import {
  ValidateVolunteerDto,
  ValidateVolunteerResponseDto,
} from './dto/validate-volunteer.dto';
import { Ministry } from '../entities/ministry.entity';
import { Season } from '../entities/season.entity';
import { VolunteerMinistrySeason } from '../entities/volunteer-ministry-season.entity';
import { VolunteerHistorySeason } from '../entities/volunteer-history-season.entity';
import { VolunteerFilterDto } from './dto/volunteer-filter.dto';
import { VolunteerListResponseDto, VolunteerListItemDto } from './dto/volunteer-list-response.dto';
import { VolunteerStatusQueryDto } from './dto/volunteer-status-query.dto';
import { CellVolunteersDto } from './dto/cell-volunteers.dto';
import { SeasonVolunteersDto } from './dto/season-volunteers.dto';
import { InscriptionCellDto, VolunteerInscriptionStatusDto } from './dto/volunteer-inscription-status.dto';

@Injectable()
export class VolunteersService {
  private readonly logger = new Logger(VolunteersService.name);
  constructor(
    @InjectRepository(Ministry)
    private ministryRepository: Repository<Ministry>,
    @InjectRepository(Volunteer)
    private volunteersRepository: Repository<Volunteer>,
    @InjectRepository(Season)
    private seasonRepository: Repository<Season>,
    @InjectRepository(VolunteerMinistrySeason)
    private volunteerMinistrySeasonRepository: Repository<VolunteerMinistrySeason>,
    @InjectRepository(VolunteerHistorySeason)
    private volunteerHistorySeasonRepository: Repository<VolunteerHistorySeason>,
    private pcsIntegrationService: PCSIntegrationService,
  ) {}

  normalizePhoneNumber(phone: string | null | undefined): string | null {
    if (!phone) return null; // trata null ou undefined
    return phone.replace(/\D/g, ""); // remove tudo que não for número
  }


  async validateVolunteer(
    data: ValidateVolunteerDto,
  ): Promise<any> {
    this.logger.debug('Iniciando validação de voluntário: ' + JSON.stringify(data));
    // 1. Buscar temporada ativa
    const today = new Date();
    this.logger.debug('Buscando temporada ativa para data: ' + today);
    const season = await this.seasonRepository
      .createQueryBuilder('s')
      .where('s.data_inicio <= :today', { today })
      .andWhere('s.active = true')
      .andWhere(
        '(s.data_fim_prorrogacao IS NOT NULL AND s.data_fim_prorrogacao >= :today) OR (s.data_fim_prorrogacao IS NULL AND s.data_fim >= :today)',
        { today }
      )
      .orderBy('s.data_inicio', 'DESC')
      .getOne();
    this.logger.debug('Season encontrada: ' + JSON.stringify(season));
    if (!season) {
      this.logger.warn('Nenhuma temporada ativa encontrada.');
      throw new NotFoundException('Temporada não disponivel para cadastro');
    }

    // 2. Buscar voluntário por email ou telefone
    this.logger.debug('Buscando voluntário por email ou telefone: ' + data.email + ', ' + data.telefone);
    const existingVolunteer = await this.volunteersRepository
                                        .createQueryBuilder('volunteer')
                                        .where('volunteer.email = :email', { email: data.email })
                                        .orWhere('volunteer.phone LIKE :phone', { phone: `%${data.telefone}` })
                                        .getOne();
    // const existingVolunteer = await this.volunteersRepository.findOne({
    //   where: [{ email: data.email }, { phone: data.telefone }],
    // });
    this.logger.debug('Voluntário encontrado: ' + JSON.stringify(existingVolunteer));

    if (existingVolunteer) {
      // Verificar se já está inscrito na temporada através do volunteer_history_season
      this.logger.debug('Verificando inscrição na temporada através do volunteer_history_season');
      const historicoSeason = await this.volunteerHistorySeasonRepository.findOne({
        where: {
          volunteer: { id: existingVolunteer.id },
          season: { id: season.id }
        }
      });

      if (historicoSeason) {
        this.logger.warn('Voluntário já está inscrito nesta temporada');
        throw new BadRequestException('Voluntário já está inscrito nesta temporada');
      }

      // Buscar dados de volunteer-ministry-season para a temporada
      this.logger.debug('Buscando volunteer-ministry-season para voluntário e temporada: ' + existingVolunteer.id + ', ' + season.id);
      const ministrySeasons = await this.volunteerMinistrySeasonRepository.find({
        where: { volunteer: existingVolunteer, season: season },
        relations: ['ministry'],
      });
      this.logger.debug('MinistrySeasons encontrados: ' + JSON.stringify(ministrySeasons));
      // Buscar histórico mais atual para o voluntário
      this.logger.debug('Buscando histórico mais atual para voluntário: ' + existingVolunteer.id);
      const historySeason = await this.volunteerHistorySeasonRepository.findOne({
        where: { volunteer: existingVolunteer },
        order: { id: 'DESC' },
        relations: ['cell'],
      });
      this.logger.debug('HistorySeason encontrado: ' + JSON.stringify(historySeason));
      if (ministrySeasons && ministrySeasons.length > 0) {
        this.logger.debug('Voluntário já registrado na temporada.');
        return {
          data: {
            ministerios: ministrySeasons.map(ms => ({ id: ms.ministry.id, name: ms.ministry.name })),
            volunteerId: existingVolunteer.id,
            seasonId: season.id
          },
          sucesso: true,
          message: 'Voluntario já foi registrado nessa temporada',
        };
      } else {

        const lastSeason = await this.volunteerMinistrySeasonRepository.createQueryBuilder('vms')
          .innerJoin('vms.season', 'season')
          .where('vms.volunteer_id = :volunteerId', { volunteerId: existingVolunteer.id })
          .orderBy('season.dataInicio', 'DESC')
          .select(['season.id'])
          .limit(1)
          .getRawOne();

        if (lastSeason) {
          // 2. Buscar todos os ministérios do voluntário para essa temporada
          const ministrySeasons = await this.volunteerMinistrySeasonRepository.find({
              where: {
                volunteer: existingVolunteer,
                season: { id: lastSeason.season_id },
                status: In(['Accepted', 'Integrated']),
              },
              relations: ['ministry'],
            });

          if (ministrySeasons && ministrySeasons.length > 0) {
            const ministerios = ministrySeasons.map(ms => ({
              id: ms.ministry.id,
              name: ms.ministry.name,
            }));

            return {
              data: {
                ministerios: ministerios,
                cell: historySeason?.cell?.name || null,
                cellId: historySeason?.cell?.id || null,
                nome: existingVolunteer.name,
                volunteerId: existingVolunteer.id,
                seasonId: season.id,
                newVolunteer: false
              },
            }
          }
        }
      this.logger.debug('Voluntário não possui dados de cell-season ou ministry-season na temporada.');
      // Se não encontrar dados de cell-season, segue para o próximo passo
    }
  }

    // 2b. Buscar usuário na API PCS
    this.logger.debug('Buscando usuário na API PCS por email: ' + data.email);
    let pcsUser = await this.pcsIntegrationService.buscarPessoaTelefoneEmail(data.email);
    if (!pcsUser) {
      this.logger.debug('Usuário não encontrado por email, buscando por telefone: ' + data.telefone);
      pcsUser = await this.pcsIntegrationService.buscarPessoaTelefoneEmail(data.telefone);
    }
    this.logger.debug('Usuário PCS encontrado: ' + JSON.stringify(pcsUser));
    if (pcsUser) {
      // Cria ou atualiza voluntário
      let volunteer = existingVolunteer;
      if (!volunteer) {
        this.logger.debug('Criando novo voluntário com dados da PCS.');
        volunteer = this.volunteersRepository.create({
          name: pcsUser.name,
          email: pcsUser.email || data.email,
          phone: this.normalizePhoneNumber(pcsUser.phone_number || data.telefone),
          birth_date: pcsUser.birthdate ? new Date(pcsUser.birthdate) : null,
          photo: pcsUser.avatar,
          registration_date: new Date(pcsUser.created_at),
          status: 'Active',
          personId: Number(pcsUser.id),
        });
      } else {
        this.logger.debug('Atualizando voluntário existente com dados da PCS.');
        volunteer.name = pcsUser.name;
        volunteer.email = pcsUser.email || data.email;
        volunteer.phone = this.normalizePhoneNumber(pcsUser.phone_number || data.telefone);
        volunteer.birth_date = pcsUser.birthdate ? new Date(pcsUser.birthdate) : null;
        volunteer.photo = pcsUser.avatar;
        volunteer.registration_date = new Date(pcsUser.created_at);
        volunteer.status = 'Active';
        volunteer.personId = Number(pcsUser.id);
      }
      await this.volunteersRepository.save(volunteer);
      this.logger.debug('Voluntário salvo/atualizado: ' + JSON.stringify(volunteer));
      // Buscar ministérios na API
        try{
            this.logger.debug('Buscando ministérios na API PCS para personId: ' + pcsUser.id);
            const ministeriosAPP = await this.pcsIntegrationService.buscarMinisterios(pcsUser.id);
            this.logger.debug('Ministérios encontrados na PCS: ' + JSON.stringify(ministeriosAPP));
          
            let ministerios = ministeriosAPP.ministerios.map(m => ({ id: Number(m.id), name: m.name }));
            if(ministerios.length > 0){
              const ministriesDB = await this.ministryRepository.find({
                where: {
                  active: true,
                  id: In(ministerios.map(m => m.id)),
                },
              });

              ministerios = ministriesDB.map(m => ({ id: m.id, name: m.name }) );
            }

            return {
              data: {
                ministerios: ministerios,
                cell: null,
                nome: volunteer.name,
                volunteerId: volunteer.id,
                seasonId: season.id,
                newVolunteer: false
              },
              message: 'Dados encontrado',
            };
        }catch(ex){
            this.logger.debug('Erro ao buscar ministérios na PCS: ' + ex.message);
            return {
              data: {
                ministerios: [] ,
                cell: null,
                nome: volunteer.name,
                volunteerId: volunteer.id,
                seasonId: season.id,
                newVolunteer: false
              },
              message: 'Dados encontrado',
            };
        }
    }
    // 2c. Usuário não encontrado, criar novo voluntário
    if (existingVolunteer) {
      this.logger.debug('Usuário não encontrado na base nem na PCS, porém já foi criado antes um temporario.');
      return {
      data: {
        ministerios: [],
        volunteerId: existingVolunteer.id,
        seasonId: season.id,
        newVolunteer: true
      },
      message: 'Novo Voluntario',
    };
    }

    this.logger.debug('Usuário não encontrado na base nem na PCS, criando novo voluntário.');
    const novoVolunteer = this.volunteersRepository.create({
      name: "TEMP DATA",
      email: data.email,
      phone: data.telefone,
      status: 'Active',
      registration_date: new Date(),
    });
    await this.volunteersRepository.save(novoVolunteer);
    this.logger.debug('Novo voluntário criado: ' + JSON.stringify(novoVolunteer));
    return {
      data: {
        ministerios: [],
        volunteerId: novoVolunteer.id,
        seasonId: season.id,
        newVolunteer: true
      },
      message: 'Novo Voluntario',
    };
  }

  async listVolunteers(seasonId: string, filters: VolunteerFilterDto): Promise<VolunteerListResponseDto> {
    this.logger.debug(`Filtros recebidos: ${JSON.stringify(filters)}`);
    this.logger.debug(`Tipo de voluntarioNovo: ${typeof filters.voluntarioNovo}, valor: ${filters.voluntarioNovo}`);
    const pageSize = filters.pageSize;
    const skip = (filters.page - 1) * pageSize;

    const query = this.volunteersRepository
      .createQueryBuilder('v')
      .innerJoin('volunteer_history_season', 'vhs', 'vhs.volunteer_id = v.id AND vhs.season_id = :seasonId', { seasonId })
      .leftJoin('cells', 'c', 'vhs.cell_id = c.id')
      .leftJoin('volunteer_ministry_season', 'vms', 'vms.volunteer_id = v.id AND vms.season_id = :seasonId', { seasonId })
      .leftJoin('ministries', 'm', 'vms.ministry_id = m.id')
      .select([
        'v.id', 'v.name', 'v.email', 'v.phone', 'v.status', 'v.registration_date', 'v.birth_date',
        'vhs.id as history_id', 'vhs.phone as new_phone', 'vhs.email as new_email',
        'vhs.cell_name', 'c.name as cell_name_from_id', 'vhs.cell_id','vhs.attendedVolunteersDay',
        'vms.id as ministry_season_id', 'vms.status as ministry_status','vhs.blockedManager','vms.principal',
        'm.id as ministry_id', 'm.name as ministry_name', 'vhs.startServicedAt', 'vhs.reason',
        'vhs.novo_voluntario AS is_new_volunteer'
      ]);

    if (filters.nome) {
      query.andWhere('v.name ILIKE :name', { name: `%${filters.nome}%` });
    }

    if (filters.email) {
      query.andWhere('vhs.email ILIKE :email', { email: `%${filters.email}%` });
    }

    if (filters.telefone) {
      query.andWhere('vhs.phone ILIKE :telefone', { telefone: `%${filters.telefone}%` });
    }

    if (filters.ministerioId) {
      query.andWhere('m.id = :ministerioId', { ministerioId: filters.ministerioId });
    }

    if (filters.attendedVolunteersDay !== undefined) {
      query.andWhere('vhs.attendedVolunteersDay = :attendedVolunteersDay', { attendedVolunteersDay: filters.attendedVolunteersDay });
    }

    if (filters.voluntarioNovo !== undefined) {
      if (filters.voluntarioNovo) {
        query.andWhere('vhs.novo_voluntario = true');
      } else {
        query.andWhere('vhs.novo_voluntario = false');
      }
    }

    if (filters.pendingApprove) {
      query.andWhere(`EXISTS (
        SELECT 1 FROM volunteer_ministry_season vms2
        WHERE vms2.volunteer_id = v.id AND vms2.season_id = :seasonId AND vms2.status = 'Created'
      )`);
    }

    if (filters.blockedManager !== undefined) {
      query.andWhere('vhs.blockedManager = :blockedManager', { blockedManager: filters.blockedManager });
    }

    if (filters.cellId) {
      query.andWhere('vhs.cell_id = :cellId', { cellId: filters.cellId });
    }

    const [volunteers, total] = await Promise.all([
      query.limit(pageSize).offset(skip).getRawMany(),
      query.getCount()
    ]);

    const groupedVolunteers = this.groupVolunteersData(volunteers);

    return {
      items: groupedVolunteers,
      total,
      page: filters.page,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  private groupVolunteersData(rawData: any[]): VolunteerListItemDto[] {
    const volunteersMap = new Map<string, VolunteerListItemDto>();

    for (const row of rawData) {

      if (!volunteersMap.has(row.v_id)) {
        volunteersMap.set(row.v_id, {
          id: row.v_id,
          name: row.v_name,
          email: row.v_email,
          phone: row.v_phone,
          status: row.v_status,
          registration_date: row.v_registration_date,
          birth_date: row.v_birth_date,
          new_phone: row.v_phone !== row.new_phone ? row.new_phone : 'Não mudou número',
          new_email: row.v_email !== row.new_email ? row.new_email : 'Não mudou email',
          cell_name: row.cell_name_from_id || row.cell_name || null,
          new_cell: !row.cell_name_from_id && row.cell_name ? true : false,
          cell_id: row.cell_id,
          history_id: row.history_id,
          new_ministeries: [],
          is_new_volunteer: row.is_new_volunteer,
          startServicedAt: row.vhs_startServicedAt,
          blockedManager: row.vhs_blockedManager,
          reason: row.vhs_reason || '',
          attendedVolunteersDay: row.vhs_attendedVolunteersDay
        });
      }

      if (row.ministry_id) {
        const volunteer = volunteersMap.get(row.v_id);
        if (!volunteer.new_ministeries.some(m => m.new_id === row.ministry_season_id)) {
          volunteer.new_ministeries.push({
            new_id: row.ministry_season_id,
            status: row.ministry_status,
            id: row.ministry_id,
            name: row.ministry_name,
            principal: row.vms_principal,
          });
        }
      }
    }

    return Array.from(volunteersMap.values());
  }

  async cancelInscription(volunteerId: string, seasonId: string): Promise<{ message: string }> {
    this.logger.debug(`Iniciando cancelamento de inscrição para voluntário ${volunteerId} na temporada ${seasonId}`);

    // Verificar se voluntário existe
    const volunteer = await this.volunteersRepository.findOne({ where: { id: volunteerId } });
    if (!volunteer) {
      this.logger.warn(`Voluntário ${volunteerId} não encontrado`);
      throw new NotFoundException('Voluntário não encontrado');
    }

    // Verificar se season existe
    const season = await this.seasonRepository.findOne({ where: { id: seasonId } });
    if (!season) {
      this.logger.warn(`Temporada ${seasonId} não encontrada`);
      throw new NotFoundException('Temporada não encontrada');
    }

    // Usar transação para deletar
    await this.volunteersRepository.manager.transaction(async (manager) => {
      // Deletar de volunteer-history-season
      const historyDeleted = await manager.delete(VolunteerHistorySeason, {
        volunteer: { id: volunteerId },
        season: { id: seasonId }
      });
      this.logger.debug(`Deletados ${historyDeleted.affected} registros de volunteer-history-season`);

      // Deletar de volunteer-ministry-season
      const ministryDeleted = await manager.delete(VolunteerMinistrySeason, {
        volunteer: { id: volunteerId },
        season: { id: seasonId }
      });
      this.logger.debug(`Deletados ${ministryDeleted.affected} registros de volunteer-ministry-season`);
    });

    this.logger.debug(`Cancelamento de inscrição concluído para voluntário ${volunteerId} na temporada ${seasonId}`);
    return { message: 'Inscrição cancelada com sucesso' };
  }

  async approveMinistries(volunteerId: string, seasonId: string, ministryIds: number[]): Promise<{ message: string }> {
    this.logger.debug(`Iniciando aprovação de ministérios para voluntário ${volunteerId} na temporada ${seasonId}`);

    // Verificar se voluntário existe
    const volunteer = await this.volunteersRepository.findOne({ where: { id: volunteerId } });
    if (!volunteer) {
      this.logger.warn(`Voluntário ${volunteerId} não encontrado`);
      throw new NotFoundException('Voluntário não encontrado');
    }

    // Verificar se season existe
    const season = await this.seasonRepository.findOne({ where: { id: seasonId } });
    if (!season) {
      this.logger.warn(`Temporada ${seasonId} não encontrada`);
      throw new NotFoundException('Temporada não encontrada');
    }

    // Buscar todos os registros de volunteer_ministry_season para o voluntário e temporada
    const ministrySeasons = await this.volunteerMinistrySeasonRepository.find({
      where: {
        volunteer: { id: volunteerId },
        season: { id: seasonId }
      },
      relations: ['ministry']
    });

    if (ministrySeasons.length === 0) {
      this.logger.warn(`Nenhum ministério encontrado para o voluntário ${volunteerId} na temporada ${seasonId}`);
      throw new NotFoundException('Nenhum ministério encontrado para este voluntário nesta temporada');
    }

    // Atualizar os status
    for (const ministrySeason of ministrySeasons) {
      if (ministryIds.includes(ministrySeason.ministry.id)) {
        ministrySeason.status = 'Accepted';
      } else {
        ministrySeason.status = 'Rejected';
      }
    }

    // Salvar as alterações
    await this.volunteerMinistrySeasonRepository.save(ministrySeasons);

    this.logger.debug(`Aprovação de ministérios concluída para voluntário ${volunteerId} na temporada ${seasonId}`);
    return { message: 'Ministérios aprovados com sucesso' };
  }

  async getVolunteerStatus(query: VolunteerStatusQueryDto): Promise<{ ministerios: { name: string; linkShadowGroup: string }[] }> {
    this.logger.debug(`Buscando status do voluntário com email: ${query.email} e telefone: ${query.telefone}`);

    // 1. Buscar temporada ativa para consulta
    const today = new Date();
    const season = await this.seasonRepository.findOne({
      where: {
        dataInicio: LessThanOrEqual(today),
        dataFim: MoreThanOrEqual(today)
      }
    });

    if (!season) {
      throw new NotFoundException('Nenhuma temporada ativa encontrada');
    }

    // 2. Buscar voluntário na volunteer_history_season para a temporada ativa
    const historySeason = await this.volunteerHistorySeasonRepository.findOne({
      where:  [
        { season: { id: season.id }, email: query.email },
        { season: { id: season.id }, phone: query.telefone },
      ],
      relations: ['volunteer']
    });

    if (!historySeason) {
      throw new NotFoundException('O cadastro de voluntário não encontrado, procure a gestão para mais informações');
    }

    if (historySeason.blockedManager) {
      throw new BadRequestException('Procure a gestao para mais informações');
    }

    // 3. Buscar ministérios com status 'Accepted' ou 'Integrated' para o voluntário nesta temporada
    const acceptedMinistries = await this.volunteerMinistrySeasonRepository.find({
      where: {
        volunteer: { id: historySeason.volunteer.id },
        season: { id: season.id },
        status: In(['Accepted', 'Integrated'])
      },
      relations: ['ministry']
    });

    if (acceptedMinistries.length === 0) {
      throw new BadRequestException('Procure a gestao para mais informações');
    }

    const ministries = acceptedMinistries.map(ms => ({
      name: ms.ministry.name,
      linkShadowGroup: ms.ministry.linkShadowGroup || ''
    }));

    return { ministerios: ministries };
  }

  async getVolunteerInscriptionStatus(query: VolunteerStatusQueryDto): Promise<VolunteerInscriptionStatusDto> {
    this.logger.debug(`Buscando status de inscrição do voluntário com email: ${query.email} e telefone: ${query.telefone}`);

    // 1. Buscar temporada ativa
    const today = new Date();
    const season = await this.seasonRepository.findOne({
      where: {
        dataInicio: LessThanOrEqual(today),
        dataFim: MoreThanOrEqual(today),
      },
    });

    if (!season) {
      throw new NotFoundException('Nenhuma temporada ativa encontrada');
    }

    // 2. Buscar registro na volunteer_history_season pela temporada ativa
    const historySeason = await this.volunteerHistorySeasonRepository.findOne({
      where: [
        { season: { id: season.id }, email: query.email },
        { season: { id: season.id }, phone: query.telefone },
      ],
      relations: ['volunteer', 'cell'],
    });

    if (!historySeason) {
      throw new NotFoundException('Cadastro de voluntário não encontrado para a temporada ativa');
    }

    // 3. Buscar todos os ministérios escolhidos na inscrição
    const ministeriosSeason = await this.volunteerMinistrySeasonRepository.find({
      where: {
        volunteer: { id: historySeason.volunteer.id },
        season: { id: season.id },
      },
      relations: ['ministry'],
    });

    const ministerios = ministeriosSeason.map(ms => ({
      name: ms.ministry.name,
      principal: ms.principal,
    }));

    const celula: InscriptionCellDto = {
      id: historySeason.cell?.id ?? null,
      name: historySeason.cell?.name ?? historySeason.cellName ?? '',
    };

    this.logger.debug(`Status de inscrição encontrado para voluntário ${historySeason.volunteer.id}: ${ministerios.length} ministério(s)`);

    return { ministerios, celula };
  }

  async batchApproveMinistries(seasonId: string, ministryId: string, volunteerIds: string[]): Promise<{ message: string }> {
    
    
    this.logger.debug(`Iniciando aprovação em lote para ministério ${ministryId} na temporada ${seasonId} para voluntários: ${volunteerIds.join(', ')}`);

    const ministryIdNum = parseInt(ministryId);

    for (const volunteerId of volunteerIds) {
      const record = await this.volunteerMinistrySeasonRepository.findOne({
        where: {
          volunteer: { id: volunteerId },
          ministry: { id: ministryIdNum },
          season: { id: seasonId },
          status: 'Created'
        }
      });

      if (record) {
        record.status = 'Accepted';
        await this.volunteerMinistrySeasonRepository.save(record);
        this.logger.debug(`Ministério ${ministryId} aprovado para voluntário ${volunteerId}`);
      } else {
        this.logger.warn(`Registro não encontrado ou já aprovado para voluntário ${volunteerId}, ministério ${ministryId}, temporada ${seasonId}`);
      }
    }

    this.logger.debug(`Aprovação em lote concluída`);
    return { message: 'Aprovação em lote realizada com sucesso' };
  }

  async blockVolunteer(volunteerId: string, seasonId: string, reason: string): Promise<{ message: string }> {
    this.logger.debug(`Iniciando bloqueio do voluntário ${volunteerId} na temporada ${seasonId} com razão: ${reason}`);

    // Verificar se voluntário existe
    const volunteer = await this.volunteersRepository.findOne({ where: { id: volunteerId } });
    if (!volunteer) {
      this.logger.warn(`Voluntário ${volunteerId} não encontrado`);
      throw new NotFoundException('Voluntário não encontrado');
    }

    // Verificar se season existe
    const season = await this.seasonRepository.findOne({ where: { id: seasonId } });
    if (!season) {
      this.logger.warn(`Temporada ${seasonId} não encontrada`);
      throw new NotFoundException('Temporada não encontrada');
    }

    // Encontrar o registro em volunteer_history_season
    const historySeason = await this.volunteerHistorySeasonRepository.findOne({
      where: {
        volunteer: { id: volunteerId },
        season: { id: seasonId }
      }
    });

    if (!historySeason) {
      this.logger.warn(`Registro de histórico do voluntário ${volunteerId} na temporada ${seasonId} não encontrado`);
      throw new NotFoundException('Registro de histórico do voluntário nesta temporada não encontrado');
    }

    // Atualizar os campos
    historySeason.blockedManager = true;
    historySeason.reason = reason;

    await this.volunteerHistorySeasonRepository.save(historySeason);

    this.logger.debug(`Bloqueio concluído para voluntário ${volunteerId} na temporada ${seasonId}`);
    return { message: 'Voluntário bloqueado com sucesso' };
  }

  async approveMinistry(volunteerId: string, seasonId: string, ministryId: number): Promise<{ message: string }> {
    this.logger.debug(`Iniciando aprovação do ministério ${ministryId} para voluntário ${volunteerId} na temporada ${seasonId}`);

    const record = await this.volunteerMinistrySeasonRepository.findOne({
      where: {
        volunteer: { id: volunteerId },
        ministry: { id: ministryId },
        season: { id: seasonId }
      }
    });

    if (!record) {
      this.logger.warn(`Registro não encontrado para voluntário ${volunteerId}, ministério ${ministryId}, temporada ${seasonId}`);
      throw new NotFoundException('Registro de ministério para este voluntário nesta temporada não encontrado');
    }

    record.status = 'Accepted';
    await this.volunteerMinistrySeasonRepository.save(record);

    this.logger.debug(`Ministério ${ministryId} aprovado para voluntário ${volunteerId} na temporada ${seasonId}`);
    return { message: 'Ministério aprovado com sucesso' };
  }

  async disapproveMinistry(volunteerId: string, seasonId: string, ministryId: number): Promise<{ message: string }> {
    this.logger.debug(`Iniciando reprovação do ministério ${ministryId} para voluntário ${volunteerId} na temporada ${seasonId}`);

    const record = await this.volunteerMinistrySeasonRepository.findOne({
      where: {
        volunteer: { id: volunteerId },
        ministry: { id: ministryId },
        season: { id: seasonId }
      }
    });

    if (!record) {
      this.logger.warn(`Registro não encontrado para voluntário ${volunteerId}, ministério ${ministryId}, temporada ${seasonId}`);
      throw new NotFoundException('Registro de ministério para este voluntário nesta temporada não encontrado');
    }

    record.status = 'Rejected';
    await this.volunteerMinistrySeasonRepository.save(record);

    this.logger.debug(`Ministério ${ministryId} reprovado para voluntário ${volunteerId} na temporada ${seasonId}`);
    return { message: 'Ministério reprovado com sucesso' };
  }

  async getVolunteersWithoutCell(seasonId: string): Promise<any[]> {
    this.logger.debug(`Buscando voluntários sem célula para a temporada ${seasonId}`);

    const result = await this.volunteersRepository
      .createQueryBuilder('v')
      .select('v.name', 'name')
      .addSelect('v.phone', 'phone')
      .addSelect('v.email', 'email')
      .addSelect('vhs.cell_name', 'cell_name')
      .innerJoin('volunteer_history_season', 'vhs', 'v.id = vhs.volunteer_id AND vhs.season_id = :seasonId', { seasonId })
      .innerJoin('volunteer_ministry_season', 'vhm', 'v.id = vhm.volunteer_id AND vhm.season_id = :seasonId')
      .innerJoin('ministries', 'm', 'm.id = vhm.ministry_id')
      .where('vhs.cell_id IS NULL')
      .getRawMany();

    this.logger.debug(`Encontrados ${result.length} voluntários sem célula`);
    return result;
  }

  async getVolunteersWithoutMinistry(seasonId: string): Promise<any[]> {
    this.logger.debug(`Buscando voluntários sem ministério para a temporada ${seasonId}`);

    const result = await this.volunteersRepository
      .createQueryBuilder('v')
      .select('v.name', 'name')
      .addSelect('vh.email', 'email')
      .addSelect('vh.phone', 'phone')
      .addSelect('v.birth_date', 'birth_date')
      .addSelect('vh.startServicedAt', 'startServicedAt')
      .addSelect(`CASE WHEN vh.novo_voluntario = true THEN 'Novo' ELSE 'Antigo' END`, 'tipoVoluntario')
      .addSelect('c.name', 'cell_name')
      .innerJoin('volunteer_history_season', 'vh', 'v.id = vh.volunteer_id AND vh.season_id = :seasonId', { seasonId })
      .innerJoin('cells', 'c', 'c.id = vh.cell_id')
      .where(`NOT EXISTS (
        SELECT 1 FROM volunteer_ministry_season vms
        WHERE vms.status IN ('Created', 'Accepted')
        AND v.id = vms.volunteer_id
        AND vms.season_id = :seasonId
      )`)
      .setParameters({ seasonId })
      .getRawMany();

    this.logger.debug(`Encontrados ${result.length} voluntários sem ministério`);
    return result;
  }

  async updateCellFrequency(volunteerId: string, frequency: number): Promise<{ message: string }> {
    this.logger.debug(`Atualizando frequência na célula para voluntário ${volunteerId} com frequência ${frequency}`);

    // Verificar se voluntário existe
    const volunteer = await this.volunteersRepository.findOne({ where: { id: volunteerId } });
    if (!volunteer) {
      this.logger.warn(`Voluntário ${volunteerId} não encontrado`);
      throw new NotFoundException('Voluntário não encontrado');
    }

    // Buscar a última temporada cadastrada
    const lastSeason = await this.seasonRepository
      .createQueryBuilder('s')
      .orderBy('s.dataInicio', 'DESC')
      .limit(1)
      .getOne();

    if (!lastSeason) {
      this.logger.warn('Nenhuma temporada encontrada');
      throw new NotFoundException('Nenhuma temporada encontrada');
    }

    this.logger.debug(`Última temporada encontrada: ${lastSeason.id} - ${lastSeason.name}`);

    // Encontrar o registro em volunteer_history_season
    const historySeason = await this.volunteerHistorySeasonRepository.findOne({
      where: {
        volunteer: { id: volunteerId },
        season: { id: lastSeason.id }
      }
    });

    if (!historySeason) {
      this.logger.warn(`Registro de histórico do voluntário ${volunteerId} na última temporada ${lastSeason.id} não encontrado`);
      throw new NotFoundException('Registro de histórico do voluntário nesta temporada não encontrado');
    }

    // Atualizar a frequência
    historySeason.cell_frequency = frequency;
    await this.volunteerHistorySeasonRepository.save(historySeason);

    this.logger.debug(`Frequência atualizada para voluntário ${volunteerId} na temporada ${lastSeason.id}`);
    return { message: 'Frequência na célula atualizada com sucesso' };
  }

  async updateAttendedVolunteersDay(volunteerId: string, seasonId: string, attended: boolean): Promise<{ message: string }> {
    this.logger.debug(`Atualizando presença no dia dos voluntários para voluntário ${volunteerId} na temporada ${seasonId} com valor ${attended}`);

    // Verificar se voluntário existe
    const volunteer = await this.volunteersRepository.findOne({ where: { id: volunteerId } });
    if (!volunteer) {
      this.logger.warn(`Voluntário ${volunteerId} não encontrado`);
      throw new NotFoundException('Voluntário não encontrado');
    }

    // Verificar se season existe
    const season = await this.seasonRepository.findOne({ where: { id: seasonId } });
    if (!season) {
      this.logger.warn(`Temporada ${seasonId} não encontrada`);
      throw new NotFoundException('Temporada não encontrada');
    }

    // Encontrar o registro em volunteer_history_season
    const historySeason = await this.volunteerHistorySeasonRepository.findOne({
      where: {
        volunteer: { id: volunteerId },
        season: { id: seasonId }
      }
    });

    if (!historySeason) {
      this.logger.warn(`Registro de histórico do voluntário ${volunteerId} na temporada ${seasonId} não encontrado`);
      throw new NotFoundException('Registro de histórico do voluntário nesta temporada não encontrado');
    }

    // Atualizar a presença
    historySeason.attendedVolunteersDay = attended;
    await this.volunteerHistorySeasonRepository.save(historySeason);

    this.logger.debug(`Presença atualizada para voluntário ${volunteerId} na temporada ${seasonId}`);
    return { message: 'Presença no dia dos voluntários atualizada com sucesso' };
  }

  async integratePerson(volunteerId: string, seasonId: string): Promise<{ message: string; personId?: string }> {
    this.logger.debug(`Iniciando integração de pessoa para voluntário ${volunteerId} na temporada ${seasonId}`);

    // 1. Buscar voluntário com dados de histórico da temporada e célula
    const historySeason = await this.volunteerHistorySeasonRepository.findOne({
      where: {
        volunteer: { id: volunteerId },
        season: { id: seasonId }
      },
      relations: ['volunteer', 'cell']
    });

    if (!historySeason) {
      this.logger.warn(`Registro de histórico do voluntário ${volunteerId} na temporada ${seasonId} não encontrado`);
      throw new NotFoundException('Registro de histórico do voluntário nesta temporada não encontrado');
    }

    const volunteer = historySeason.volunteer;

    // 2. Verificar se já está integrado
    if (volunteer.personId) {
      this.logger.debug(`Voluntário ${volunteerId} já está integrado com personId ${volunteer.personId}`);
      return { message: 'Voluntário já está integrado', personId: volunteer.personId.toString() };
    }

    // 3. Chamar adicionarPessoa
    const nameParts = volunteer.name.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '';
    const birthdate = volunteer.birth_date ? new Date(volunteer.birth_date).toISOString().split('T')[0] : '';

    this.logger.debug(`Chamando adicionarPessoa com firstName: ${firstName}, lastName: ${lastName}, birthdate: ${birthdate}`);
    const personId = await this.pcsIntegrationService.adicionarPessoa(firstName, lastName, birthdate);

    // 4. Atualizar volunteer com personId
    volunteer.personId = Number(personId);
    await this.volunteersRepository.save(volunteer);
    this.logger.debug(`Voluntário ${volunteerId} atualizado com personId ${personId}`);

    // 5. Chamar adicionarEmail
    if (historySeason.email) {
      this.logger.debug(`Chamando adicionarEmail com email: ${historySeason.email}, personId: ${personId}`);
      await this.pcsIntegrationService.adicionarEmail(personId, historySeason.email);
    }

    // 6. Chamar adicionarTelefone
    if (historySeason.phone) {
      const cleanPhone = historySeason.phone.replace(/\D/g, '');
      const phoneWithCountry = `55${cleanPhone}`;
      this.logger.debug(`Chamando adicionarTelefone com phone: ${phoneWithCountry}, personId: ${personId}`);
      await this.pcsIntegrationService.adicionarTelefone(personId, phoneWithCountry);
    }

    // 7. Chamar adicionarCelula se tiver cell
    if (historySeason.cell) {
      this.logger.debug(`Chamando adicionarCelula com nomeCelula: ${historySeason.cell.name}, personId: ${personId}`);
      await this.pcsIntegrationService.adicionarCelula(personId, historySeason.cell.name);
    }

    // 8. Chamar adicionarServeDesde
    const ano = historySeason.startServicedAt ? new Date(historySeason.startServicedAt).getFullYear() : new Date().getFullYear();
    this.logger.debug(`Chamando adicionarServeDesde com ano: ${ano}, personId: ${personId}`);
    await this.pcsIntegrationService.adicionarServeDesde(personId, ano);

    // 9. Chamar darPermissaoApp
    this.logger.debug(`Chamando darPermissaoApp para personId: ${personId}`);
    await this.pcsIntegrationService.darPermissaoApp(personId);

    this.logger.debug(`Integração concluída para voluntário ${volunteerId}`);
    return { message: 'Integração realizada com sucesso', personId };
  }

  async integrateAllPersons(seasonId: string): Promise<{ message: string }> {
    this.logger.debug(`Iniciando integração em lote para temporada ${seasonId}`);

    // Buscar voluntários pendentes
    const pendingVolunteers = await this.volunteersRepository
      .createQueryBuilder('v')
      .select('v.id', 'id')
      .innerJoin('volunteer_history_season', 'vhs', 'v.id = vhs.volunteer_id')
      .innerJoin('cells', 'c', 'vhs.cell_id = c.id')
      .where('v.person_id IS NULL')
      .andWhere('vhs.blockedManager = false')
      .andWhere('vhs.season_id = :seasonId', { seasonId })
      .andWhere(`EXISTS (
        SELECT 1 FROM volunteer_ministry_season vm
        WHERE vm.volunteer_id = v.id AND vm.season_id = :seasonId AND vm.status = 'Accepted'
      )`)
      .setParameters({ seasonId })
      .getRawMany();

    this.logger.debug(`Encontrados ${pendingVolunteers.length} voluntários pendentes para integração`);

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    for (const volunteer of pendingVolunteers) {
      try {
        this.logger.debug(`Integrando voluntário ${volunteer.id}`);
        await this.integratePerson(volunteer.id, seasonId);
        await delay(2000); // Delay de 2 segundos entre chamadas
      } catch (error) {
        this.logger.error(`Erro ao integrar voluntário ${volunteer.id}: ${error.message}`);
        // Continua para o próximo
      }
    }

    this.logger.debug(`Integração em lote concluída para temporada ${seasonId}`);
    return { message: 'Integração em lote realizada com sucesso' };
  }

  async integrateMinistries(volunteerId: string, seasonId: string): Promise<{ message: string }> {
    this.logger.debug(`Iniciando integração de ministérios para voluntário ${volunteerId} na temporada ${seasonId}`);

    // Verificar se voluntário tem personId
    const volunteer = await this.volunteersRepository.findOne({ where: { id: volunteerId } });
    if (!volunteer || !volunteer.personId) {
      throw new BadRequestException('Voluntário não integrado ao PCS ainda.');
    }

    // Buscar ministérios com status 'Accepted' ou 'Integrated' para a temporada
    const acceptedMinistries = await this.volunteerMinistrySeasonRepository.find({
      where: [
        { volunteer: { id: volunteerId }, season: { id: seasonId }, status: 'Accepted' },
        { volunteer: { id: volunteerId }, season: { id: seasonId }, status: 'Integrated' },
      ],
      relations: ['ministry']
    });

    if (acceptedMinistries.length === 0) {
      this.logger.debug(`Nenhum ministério para integrar para voluntário ${volunteerId}`);
      return { message: 'Nenhum ministério para integrar' };
    }

    const ministryIds = acceptedMinistries.map(ms => ms.ministry.id.toString());

    this.logger.debug(`Integrando ministérios ${ministryIds.join(', ')} para personId ${volunteer.personId}`);

    // Chamar atualizarMinisterios
    await this.pcsIntegrationService.atualizarMinisterios(volunteer.personId.toString(), ministryIds);

    // Chamar adicionarTemporada: buscar e deletar o FieldDatum existente (se houver), depois adicionar
    const personIdStr = volunteer.personId.toString();
    const fieldDatumId = await this.pcsIntegrationService.buscarFieldDatumTemporada(personIdStr);
    if (fieldDatumId) {
      this.logger.debug(`Deletando FieldDatum de temporada existente: fieldDatumId=${fieldDatumId}, personId=${personIdStr}`);
      try {
        await this.pcsIntegrationService.deletarFieldDatum(personIdStr, fieldDatumId);
      } catch (e) {
        this.logger.debug(`Erro ao deletar FieldDatum de temporada (ignorado): ${e.message}`);
      }
    }
    await this.pcsIntegrationService.adicionarTemporada(personIdStr, "01/2026");

    // Atualizar status para 'Integrated'
    for (const ms of acceptedMinistries) {
      ms.status = 'Integrated';
    }
    await this.volunteerMinistrySeasonRepository.save(acceptedMinistries);

    this.logger.debug(`Integração de ministérios concluída para voluntário ${volunteerId}`);
    return { message: 'Ministérios integrados com sucesso' };
  }

  async getVolunteersByCell(cellId: string): Promise<CellVolunteersDto[]> {
    this.logger.debug(`Buscando voluntários da célula ${cellId} na última temporada`);

    // 1. Buscar a última temporada cadastrada
    const lastSeason = await this.seasonRepository
      .createQueryBuilder('s')
      .orderBy('s.dataInicio', 'DESC')
      .limit(1)
      .getOne();

    if (!lastSeason) {
      this.logger.warn('Nenhuma temporada encontrada');
      throw new NotFoundException('Nenhuma temporada encontrada');
    }

    this.logger.debug(`Última temporada encontrada: ${lastSeason.id} - ${lastSeason.name}`);

    // 2. Buscar voluntários da temporada com o cell_id especificado
    const result = await this.volunteersRepository
      .createQueryBuilder('v')
      .select('v.id', 'volunteer_id')
      .addSelect('v.name', 'name')
      .addSelect('vhs.cell_frequency', 'cell_frequency')
      .addSelect(`EXTRACT(YEAR FROM AGE(CURRENT_DATE, v.birth_date))`, 'age')
      .innerJoin('volunteer_history_season', 'vhs', 'v.id = vhs.volunteer_id AND vhs.season_id = :seasonId', { seasonId: lastSeason.id })
      .where('vhs.cell_id = :cellId', { cellId })
      .orderBy('v.name', 'ASC')
      .getRawMany();

    this.logger.debug(`Encontrados ${result.length} voluntários na célula ${cellId} para a temporada ${lastSeason.id}`);

    return result;
  }

  async getVolunteersBySeason(seasonId: string): Promise<SeasonVolunteersDto[]> {
    this.logger.debug(`Buscando voluntários da temporada ${seasonId} ordenados por cell_id`);

    // Verificar se season existe
    const season = await this.seasonRepository.findOne({ where: { id: seasonId } });
    if (!season) {
      this.logger.warn(`Temporada ${seasonId} não encontrada`);
      throw new NotFoundException('Temporada não encontrada');
    }

    // Buscar voluntários da temporada ordenados por cell_id
    const result = await this.volunteersRepository
      .createQueryBuilder('v')
      .select('v.id', 'volunteer_id')
      .addSelect('v.name', 'name')
      .addSelect('vhs.email', 'email')
      .addSelect('vhs.phone', 'phone')
      .addSelect('vhs.cell_frequency', 'cell_frequency')
      .addSelect('vhs.cell_id', 'cell_id')
      .addSelect('c.name', 'cell_name')
      .innerJoin('volunteer_history_season', 'vhs', 'v.id = vhs.volunteer_id AND vhs.season_id = :seasonId', { seasonId })
      .innerJoin('cells', 'c', 'vhs.cell_id = c.id')
      .orderBy('vhs.cell_id', 'ASC')
      .addOrderBy('v.name', 'ASC')
      .getRawMany();

    this.logger.debug(`Encontrados ${result.length} voluntários na temporada ${seasonId}`);

    return result;
  }
}