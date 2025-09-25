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
    const season = await this.seasonRepository.findOne({
      where: [
        { dataInicio: LessThanOrEqual(today), dataFim: MoreThanOrEqual(today), active : true },
      ],
      order: { dataInicio: 'DESC' },
    });
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
        volunteer.email = pcsUser.email;
        volunteer.phone = this.normalizePhoneNumber(pcsUser.phone_number);
        volunteer.birth_date = new Date(pcsUser.birthdate);
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
        'v.id', 'v.name', 'v.email', 'v.phone', 'v.status', 'v.registration_date',
        'vhs.id as history_id', 'vhs.phone as new_phone', 'vhs.email as new_email',
        'vhs.cell_name', 'c.name as cell_name_from_id', 'vhs.cell_id',
        'vms.id as ministry_season_id', 'vms.status as ministry_status',
        'm.id as ministry_id', 'm.name as ministry_name', 'vhs.startServicedAt',
        'CASE WHEN v.person_id IS NULL THEN true ELSE false END AS is_new_volunteer'
      ]);

    if (filters.nome) {
      query.andWhere('v.name ILIKE :name', { name: `%${filters.nome}%` });
    }

    if (filters.email) {
      query.andWhere('v.email ILIKE :email', { email: `%${filters.email}%` });
    }

    if (filters.ministerioId) {
      query.andWhere('m.id = :ministerioId', { ministerioId: filters.ministerioId });
    }

    if (filters.voluntarioNovo !== undefined) {
      if (filters.voluntarioNovo) {
        query.andWhere('v.person_id IS NULL');
      } else {
        query.andWhere('v.person_id IS NOT NULL');
      } 
    }

    if (filters.pendingApprove) {
      query.andWhere(`EXISTS (
        SELECT 1 FROM volunteer_ministry_season vms2
        WHERE vms2.volunteer_id = v.id AND vms2.season_id = :seasonId AND vms2.status = 'Created'
      )`);
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
          new_phone: row.v_phone !== row.new_phone ? row.new_phone : 'Não mudou número',
          new_email: row.v_email !== row.new_email ? row.new_email : 'Não mudou email',
          cell_name: row.cell_name_from_id || row.cell_name || null,
          new_cell: !row.cell_name_from_id && row.cell_name ? true : false,
          cell_id: row.cell_id,
          history_id: row.history_id,
          new_ministeries: [],
          is_new_volunteer: row.is_new_volunteer,
          startServicedAt: row.vhs_startServicedAt
        });
      }

      if (row.ministry_id) {
        const volunteer = volunteersMap.get(row.v_id);
        if (!volunteer.new_ministeries.some(m => m.new_id === row.ministry_season_id)) {
          volunteer.new_ministeries.push({
            new_id: row.ministry_season_id,
            status: row.ministry_status,
            id: row.ministry_id,
            name: row.ministry_name
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
}