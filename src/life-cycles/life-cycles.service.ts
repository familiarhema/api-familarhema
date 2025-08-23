import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LifeCycle } from '../entities/life-cycle.entity';
import { MilestoneRole } from '../entities/milestone-role.entity';
import { CreateLifeCycleDto } from './dto/create-life-cycle.dto';
import { UpdateLifeCycleDto } from './dto/update-life-cycle.dto';

@Injectable()
export class LifeCyclesService {
  constructor(
    @InjectRepository(LifeCycle)
    private lifeCycleRepository: Repository<LifeCycle>,
    @InjectRepository(MilestoneRole)
    private milestoneRoleRepository: Repository<MilestoneRole>,
  ) {}

  async create(createLifeCycleDto: CreateLifeCycleDto): Promise<LifeCycle> {
    const lifeCycle = this.lifeCycleRepository.create(createLifeCycleDto);
    return await this.lifeCycleRepository.save(lifeCycle);
  }

  async findAll(): Promise<LifeCycle[]> {
    return await this.lifeCycleRepository.find({
      relations: ['life_cycle_milestones', 'life_cycle_milestones.milestone']
    });
  }

  async findAllByUserRole(roleId: string): Promise<LifeCycle[]> {
    // Get all life cycles that have milestones with permissions for this role
    const lifeCycles = await this.lifeCycleRepository
      .createQueryBuilder('lifeCycle')
      .leftJoinAndSelect('lifeCycle.life_cycle_milestones', 'lifeCycleMilestone')
      .leftJoinAndSelect('lifeCycleMilestone.milestone', 'milestone')
      .innerJoin('milestone_roles', 'milestoneRole', 'milestoneRole.milestone_id = milestone.id')
      .where('milestoneRole.role_id = :roleId', { roleId })
      .getMany();

    return lifeCycles;
  }

  async findOne(id: string): Promise<LifeCycle> {
    const lifeCycle = await this.lifeCycleRepository.findOne({
      where: { id },
      relations: ['life_cycle_milestones', 'life_cycle_milestones.milestone']
    });

    if (!lifeCycle) {
      throw new NotFoundException(`Life cycle with ID ${id} not found`);
    }

    return lifeCycle;
  }

  async update(id: string, updateLifeCycleDto: UpdateLifeCycleDto): Promise<LifeCycle> {
    const lifeCycle = await this.findOne(id);
    
    Object.assign(lifeCycle, updateLifeCycleDto);
    
    return await this.lifeCycleRepository.save(lifeCycle);
  }

  async remove(id: string): Promise<void> {
    const result = await this.lifeCycleRepository.delete(id);
    
    if (result.affected === 0) {
      throw new NotFoundException(`Life cycle with ID ${id} not found`);
    }
  }
}