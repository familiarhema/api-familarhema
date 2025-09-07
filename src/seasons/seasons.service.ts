import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Season } from '../entities/season.entity';
import { Volunteer } from '../entities/volunteer.entity';
import { Cell } from '../entities/cell.entity';
import { Ministry } from '../entities/ministry.entity';
import { VolunteerHistorySeason } from '../entities/volunteer-history-season.entity';
import { VolunteerMinistrySeason } from '../entities/volunteer-ministry-season.entity';
import { InscreverSeSeasonDto } from './dto/inscrever-se-season.dto';

@Injectable()
export class SeasonsService {
  constructor(
    @InjectRepository(Season)
    private seasonRepository: Repository<Season>,
    @InjectRepository(Volunteer)
    private volunteerRepository: Repository<Volunteer>,
    @InjectRepository(Cell)
    private cellRepository: Repository<Cell>,
    @InjectRepository(Ministry)
    private ministryRepository: Repository<Ministry>,
    @InjectRepository(VolunteerHistorySeason)
    private volunteerHistorySeasonRepository: Repository<VolunteerHistorySeason>,
    @InjectRepository(VolunteerMinistrySeason)
    private volunteerMinistrySeasonRepository: Repository<VolunteerMinistrySeason>,
  ) {}

  async inscreverSe(seasonId: string, dto: InscreverSeSeasonDto) {
    // 1. Verificar se a Season está ativa
    const today = new Date();
    const season = await this.seasonRepository.findOne({
      where: {
        id: seasonId,
        dataInicio: LessThanOrEqual(today),
        dataFim: MoreThanOrEqual(today)
      }
    });

    if (!season) {
      throw new NotFoundException('Temporada não disponível para inscrição');
    }

    // 2. Verificar se o voluntário existe
    const volunteer = await this.volunteerRepository.findOne({
      where: { id: dto.codigo }
    });

    if (!volunteer) {
      throw new NotFoundException('Voluntário não encontrado');
    }

    // 3. Verificar se já está inscrito na season
    const jaInscrito = await this.volunteerHistorySeasonRepository.findOne({
      where: {
        volunteer: { id: volunteer.id },
        season: { id: seasonId }
      }
    });

    if (jaInscrito) {
      throw new BadRequestException('Voluntário já inscrito nesta temporada');
    }

    // 4. Verificar se a célula existe
    const cell = await this.cellRepository.findOne({
      where: { id: dto.celula.codigo }
    });

    if (!cell) {
      throw new NotFoundException('Célula não encontrada');
    }

    // 5. Verificar se os ministérios existem
    const ministerios = await this.ministryRepository.find({
      where: dto.ministerios.map(id => ({ id }))
    });

    if (ministerios.length !== dto.ministerios.length) {
      throw new NotFoundException('Um ou mais ministérios não foram encontrados');
    }

    // 6. Atualizar dados do voluntário se fornecidos
    if (dto.nomeVoluntario || dto.dataNascimento) {
      if (dto.nomeVoluntario) volunteer.name = dto.nomeVoluntario;
      if (dto.dataNascimento) volunteer.birth_date = dto.dataNascimento;
      await this.volunteerRepository.save(volunteer);
    }

    // 7. Criar registro na volunteer_history_season
    const historySeason = this.volunteerHistorySeasonRepository.create({
      volunteer,
      season,
      cell,
      email: dto.email,
      phone: dto.celular
    });

    await this.volunteerHistorySeasonRepository.save(historySeason);

    // 8. Criar registros na volunteer_ministry_season
    const ministrySeasons = ministerios.map(ministry => 
      this.volunteerMinistrySeasonRepository.create({
        volunteer,
        ministry,
        season,
        status: 'Created'
      })
    );

    await this.volunteerMinistrySeasonRepository.save(ministrySeasons);

    return {
      message: 'Inscrição realizada com sucesso',
      data: {
        seasonId: season.id,
        volunteerId: volunteer.id,
        ministerios: ministerios.map(m => ({ id: m.id, name: m.name })),
        celula: {
          id: cell.id,
          nome: cell.name
        }
      }
    };
  }
}