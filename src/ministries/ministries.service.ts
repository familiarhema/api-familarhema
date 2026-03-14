import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ministry } from '../entities/ministry.entity';
import { MinistryResponseDto } from './dto/ministry-response.dto';
import { PCSIntegrationService } from '../integrations/pcs/pcs-integration.service';
import { VolunteerMinistrySeason } from '../entities/volunteer-ministry-season.entity';
import { Volunteer } from '../entities/volunteer.entity';

@Injectable()
export class MinistriesService {
  constructor(
    @InjectRepository(Ministry)
    private ministriesRepository: Repository<Ministry>,
    private pcsIntegrationService: PCSIntegrationService,
  ) {}

  async getActive(): Promise<MinistryResponseDto[]> {
    const ministries = await this.ministriesRepository.find({
      select: ['id', 'name', 'description', 'hearing', 'hideNewVolunteer', 'onlyIndicatin'],
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
}