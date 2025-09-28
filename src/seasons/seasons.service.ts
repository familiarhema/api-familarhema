import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SeasonFilterDto } from './dto/season-filter.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Season } from '../entities/season.entity';
import { Volunteer } from '../entities/volunteer.entity';
import { Cell } from '../entities/cell.entity';
import { Ministry } from '../entities/ministry.entity';
import { VolunteerHistorySeason } from '../entities/volunteer-history-season.entity';
import { VolunteerMinistrySeason } from '../entities/volunteer-ministry-season.entity';
import { InscreverSeSeasonDto } from './dto/inscrever-se-season.dto';
import { UpdateVolunteerSeasonDto } from './dto/update-volunteer-season.dto';

@Injectable()
export class SeasonsService {
  async findAll(filters: SeasonFilterDto) {
    const queryBuilder = this.seasonRepository
      .createQueryBuilder('season');

    if (filters.name) {
      queryBuilder.andWhere('LOWER(season.name) LIKE LOWER(:name)', {
        name: `%${filters.name}%`
      });
    }

    if (filters.active !== undefined) {
      queryBuilder.andWhere('season.active = :active', {
        active: filters.active
      });
    }

    return queryBuilder.getMany();
  }

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

    // if (!cell) {
    //   throw new NotFoundException('Célula não encontrada');
    // }

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
      phone: dto.celular,
      cellName: cell ? null : dto.celula.nome,
      startServicedAt: dto.sirvoDesde || null
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
          id: cell?.id || '00000000-0000-0000-0000-000000000000',
          nome: cell ? cell.name : dto.celula.nome
        }
      }
    };
  }

  async getVolunteersByMinistry(seasonId: string) {
    const result = await this.volunteerMinistrySeasonRepository
      .createQueryBuilder('vms')
      .select('m.name', 'ministryName')
      .addSelect('COUNT(DISTINCT vms.volunteer_id)', 'total')
      .innerJoin('vms.ministry', 'm')
      .where('vms.season_id = :seasonId', { seasonId })
      .groupBy('m.id')
      .orderBy('total', 'DESC')
      .getRawMany();

    return result.map(row => ({
      ministryName: row.ministryName,
      total: parseInt(row.total)
    }));
  }

  async getVolunteersByCell(seasonId: string) {
    const result = await this.volunteerHistorySeasonRepository
      .createQueryBuilder('vhs')
      .select('COALESCE(c.name, vhs.cell_name)', 'cellName')
      .addSelect('COUNT(DISTINCT vhs.volunteer_id)', 'total')
      .leftJoin('vhs.cell', 'c')
      .where('vhs.season_id = :seasonId', { seasonId })
      .groupBy('c.id, vhs.cell_name')
      .orderBy('total', 'DESC')
      .getRawMany();

    return result.map(row => ({
      cellName: row.cellName,
      total: parseInt(row.total)
    }));
  }

  async getVolunteersNewVsOld(seasonId: string) {
    const result = await this.volunteerHistorySeasonRepository
      .createQueryBuilder('vhs')
      .select("CASE WHEN vhs.startServicedAt IS NULL THEN 'novo' ELSE 'antigo' END", 'type')
      .addSelect('COUNT(DISTINCT vhs.volunteer_id)', 'total')
      .innerJoin('vhs.volunteer', 'v')
      .where('vhs.season_id = :seasonId', { seasonId })
      .groupBy("CASE WHEN vhs.startServicedAt IS NULL THEN 'novo' ELSE 'antigo' END")
      .getRawMany();

    const response = { novo: 0, antigo: 0 };
    result.forEach(row => {
      response[row.type] = parseInt(row.total);
    });
    return response;
  }

  async getVolunteersByAgeGroup(seasonId: string) {
    const result = await this.volunteerHistorySeasonRepository
      .createQueryBuilder('vhs')
      .select(`
        CASE
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, v.birth_date)) BETWEEN 0 AND 8 THEN '0-8'
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, v.birth_date)) BETWEEN 9 AND 15 THEN '9-15'
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, v.birth_date)) BETWEEN 16 AND 17 THEN '16-17'
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, v.birth_date)) BETWEEN 18 AND 29 THEN '18-29'
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, v.birth_date)) BETWEEN 30 AND 40 THEN '30-40'
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, v.birth_date)) BETWEEN 41 AND 60 THEN '41-60'
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, v.birth_date)) >= 60 THEN '60-100'
          ELSE 'unknown'
        END`, 'ageGroup')
      .addSelect('COUNT(DISTINCT vhs.volunteer_id)', 'total')
      .innerJoin('vhs.volunteer', 'v')
      .where('vhs.season_id = :seasonId AND v.birth_date IS NOT NULL', { seasonId })
      .groupBy(`
        CASE
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, v.birth_date)) BETWEEN 0 AND 8 THEN '0-8'
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, v.birth_date)) BETWEEN 9 AND 15 THEN '9-15'
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, v.birth_date)) BETWEEN 16 AND 17 THEN '16-17'
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, v.birth_date)) BETWEEN 18 AND 29 THEN '18-29'
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, v.birth_date)) BETWEEN 30 AND 40 THEN '30-40'
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, v.birth_date)) BETWEEN 41 AND 60 THEN '41-60'
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, v.birth_date)) >= 60 THEN '60-100'
          ELSE 'unknown'
        END`)
      .orderBy('1', 'ASC')
      .getRawMany();

    return result.map(row => ({
      ageGroup: row.ageGroup,
      total: parseInt(row.total)
    }));
  }

  async updateVolunteerSeason(seasonId: string, volunteerId: string, dto: UpdateVolunteerSeasonDto) {
    // 1. Verificar se a season existe
    const season = await this.seasonRepository.findOne({ where: { id: seasonId } });
    if (!season) {
      throw new NotFoundException('Temporada não encontrada');
    }

    // 2. Verificar se o voluntário existe
    const volunteer = await this.volunteerRepository.findOne({ where: { id: volunteerId } });
    if (!volunteer) {
      throw new NotFoundException('Voluntário não encontrado');
    }

    // 3. Encontrar ou criar o registro em volunteer_history_season
    let historySeason = await this.volunteerHistorySeasonRepository.findOne({
      where: {
        volunteer: { id: volunteerId },
        season: { id: seasonId }
      }
    });

    if (!historySeason) {
      throw new NotFoundException('Registro de histórico do voluntário nesta temporada não encontrado');
    }

    // 4. Verificar se a célula existe
    const cell = await this.cellRepository.findOne({ where: { id: dto.cell_id } });
    if (!cell) {
      throw new NotFoundException('Célula não encontrada');
    }

    // 5. Atualizar os campos
    historySeason.startServicedAt = dto.startServicedAt;
    historySeason.cell = cell;

    await this.volunteerHistorySeasonRepository.save(historySeason);

    // 6. Processar os ministérios
    for (const ministryDto of dto.ministries) {
      // Verificar se o ministério existe
      const ministry = await this.ministryRepository.findOne({ where: { id: ministryDto.ministry_id } });
      if (!ministry) {
        throw new NotFoundException(`Ministério ${ministryDto.ministry_id} não encontrado`);
      }

      // Encontrar registro existente
      let ministrySeason = await this.volunteerMinistrySeasonRepository.findOne({
        where: {
          volunteer: { id: volunteerId },
          ministry: { id: ministryDto.ministry_id },
          season: { id: seasonId }
        }
      });

      if (ministrySeason) {
        // Atualizar status
        ministrySeason.status = ministryDto.status;
      } else {
        // Criar novo
        ministrySeason = this.volunteerMinistrySeasonRepository.create({
          volunteer,
          ministry,
          season,
          status: ministryDto.status
        });
      }

      await this.volunteerMinistrySeasonRepository.save(ministrySeason);
    }

    return {
      message: 'Atualização realizada com sucesso',
      data: {
        seasonId,
        volunteerId,
        startServicedAt: dto.startServicedAt,
        cell_id: dto.cell_id,
        ministries: dto.ministries
      }
    };
  }
}