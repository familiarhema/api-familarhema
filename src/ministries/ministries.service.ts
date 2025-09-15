import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ministry } from '../entities/ministry.entity';
import { MinistryResponseDto } from './dto/ministry-response.dto';

@Injectable()
export class MinistriesService {
  constructor(
    @InjectRepository(Ministry)
    private ministriesRepository: Repository<Ministry>,
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
}