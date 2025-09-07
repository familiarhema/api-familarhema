import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, LessThanOrEqual, MoreThanOrEqual, In } from 'typeorm';
import { Volunteer } from '../entities/volunteer.entity';
import { PCSIntegrationService } from '../integrations/pcs/pcs-integration.service';
import {
  ValidateVolunteerDto,
  ValidateVolunteerResponseDto,
} from './dto/validate-volunteer.dto';
import { Season } from '../entities/season.entity';
import { VolunteerMinistrySeason } from '../entities/volunteer-ministry-season.entity';
import { VolunteerHistorySeason } from '../entities/volunteer-history-season.entity';

@Injectable()
export class VolunteersService {
  constructor(
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

  async validateVolunteer(
    data: ValidateVolunteerDto,
  ): Promise<any> {
    console.log('Iniciando validação de voluntário:', data);
    // 1. Buscar temporada ativa
    const today = new Date();
    console.log('Buscando temporada ativa para data:', today);
    const season = await this.seasonRepository.findOne({
      where: [
        { dataInicio: LessThanOrEqual(today), dataFim: MoreThanOrEqual(today) },
      ],
      order: { dataInicio: 'DESC' },
    });
    console.log('Season encontrada:', season);
    if (!season) {
      console.log('Nenhuma temporada ativa encontrada.');
      throw new NotFoundException('Temporada não disponivel para cadastro');
    }

    // 2. Buscar voluntário por email ou telefone
    console.log('Buscando voluntário por email ou telefone:', data.email, data.telefone);
    const existingVolunteer = await this.volunteersRepository.findOne({
      where: [{ email: data.email }, { phone: data.telefone }],
    });
    console.log('Voluntário encontrado:', existingVolunteer);

    if (existingVolunteer) {
      // Verificar se já está inscrito na temporada através do volunteer_history_season
      console.log('Verificando inscrição na temporada através do volunteer_history_season');
      const historicoSeason = await this.volunteerHistorySeasonRepository.findOne({
        where: {
          volunteer: { id: existingVolunteer.id },
          season: { id: season.id }
        }
      });

      if (historicoSeason) {
        throw new BadRequestException('Voluntário já está inscrito nesta temporada');
      }

      // Buscar dados de volunteer-ministry-season para a temporada
      console.log('Buscando volunteer-ministry-season para voluntário e temporada:', existingVolunteer.id, season.id);
      const ministrySeasons = await this.volunteerMinistrySeasonRepository.find({
        where: { volunteer: existingVolunteer, season: season },
        relations: ['ministry'],
      });
      console.log('MinistrySeasons encontrados:', ministrySeasons);
      // Buscar histórico mais atual para o voluntário
      console.log('Buscando histórico mais atual para voluntário:', existingVolunteer.id);
      const historySeason = await this.volunteerHistorySeasonRepository.findOne({
        where: { volunteer: existingVolunteer },
        order: { id: 'DESC' },
        relations: ['cell'],
      });
      console.log('HistorySeason encontrado:', historySeason);
      if (ministrySeasons && ministrySeasons.length > 0) {
        console.log('Voluntário já registrado na temporada.');
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
                seasonId: season.id
              },
            }
          }
        }
      console.log('Voluntário não possui dados de cell-season ou ministry-season na temporada.');
      // Se não encontrar dados de cell-season, segue para o próximo passo
    }
  }

    // 2b. Buscar usuário na API PCS
    console.log('Buscando usuário na API PCS por email:', data.email);
    let pcsUser = await this.pcsIntegrationService.buscarPessoaTelefoneEmail(data.email);
    if (!pcsUser) {
      console.log('Usuário não encontrado por email, buscando por telefone:', data.telefone);
      pcsUser = await this.pcsIntegrationService.buscarPessoaTelefoneEmail(data.telefone);
    }
    console.log('Usuário PCS encontrado:', pcsUser);
    if (pcsUser) {
      // Cria ou atualiza voluntário
      let volunteer = existingVolunteer;
      if (!volunteer) {
        console.log('Criando novo voluntário com dados da PCS.');
        volunteer = this.volunteersRepository.create({
          name: pcsUser.name,
          email: pcsUser.email,
          phone: pcsUser.phone_number,
          birth_date: new Date(pcsUser.birthdate),
          photo: pcsUser.avatar,
          registration_date: new Date(pcsUser.created_at),
          status: 'Active',
          personId: Number(pcsUser.id),
        });
      } else {
        console.log('Atualizando voluntário existente com dados da PCS.');
        volunteer.name = pcsUser.name;
        volunteer.email = pcsUser.email;
        volunteer.phone = pcsUser.phone_number;
        volunteer.birth_date = new Date(pcsUser.birthdate);
        volunteer.photo = pcsUser.avatar;
        volunteer.registration_date = new Date(pcsUser.created_at);
        volunteer.status = 'Active';
        volunteer.personId = Number(pcsUser.id);
      }
      await this.volunteersRepository.save(volunteer);
      console.log('Voluntário salvo/atualizado:', volunteer);
      // Buscar ministérios na API
      console.log('Buscando ministérios na API PCS para personId:', pcsUser.id);
      const ministerios = await this.pcsIntegrationService.buscarMinisterios(pcsUser.id);
      console.log('Ministérios encontrados na PCS:', ministerios);
      return {
        data: {
          ministerios: ministerios.ministerios,
          cell: null,
          nome: volunteer.name,
          volunteerId: volunteer.id,
          seasonId: season.id
        },
        message: 'Dados encontrado',
      };
    }
    // 2c. Usuário não encontrado, criar novo voluntário
    console.log('Usuário não encontrado na base nem na PCS, criando novo voluntário.');
    const novoVolunteer = this.volunteersRepository.create({
      name: "TEMP DATA",
      email: data.email,
      phone: data.telefone,
      status: 'Active',
      registration_date: new Date(),
    });
    await this.volunteersRepository.save(novoVolunteer);
    console.log('Novo voluntário criado:', novoVolunteer);
    return {
      data: {
        ministerios: [],
        volunteerId: novoVolunteer.id,
        seasonId: season.id
      },
      message: 'Novo Voluntario',
    };
  }
}