import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Milestone } from '../entities/milestone.entity';
import { MilestoneStep } from '../entities/milestone-step.entity';
import { LifeCycle } from '../entities/life-cycle.entity';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';

@Injectable()
export class MilestonesService {
  constructor(
    @InjectRepository(Milestone)
    private readonly milestoneRepository: Repository<Milestone>,
    @InjectRepository(MilestoneStep)
    private readonly milestoneStepRepository: Repository<MilestoneStep>,
    @InjectRepository(LifeCycle)
    private readonly lifeCycleRepository: Repository<LifeCycle>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createMilestoneDto: CreateMilestoneDto): Promise<Milestone> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check if life cycle exists
      const lifeCycle = await this.lifeCycleRepository.findOne({
        where: { id: createMilestoneDto.life_cycle_id }
      });

      if (!lifeCycle) {
        throw new NotFoundException(`Life cycle with ID ${createMilestoneDto.life_cycle_id} not found`);
      }

      // Create milestone
      const milestone = this.milestoneRepository.create({
        name: createMilestoneDto.name,
        icon: createMilestoneDto.icon
      });
      await queryRunner.manager.save(milestone);

      // Create milestone steps
      const steps = await Promise.all(
        createMilestoneDto.steps.map(async (stepDto) => {
          const step = this.milestoneStepRepository.create({
            milestone: milestone,
            name: stepDto.name,
            position: stepDto.order
          });
          return await queryRunner.manager.save(step);
        })
      );

      // Update next_step references
      for (let i = 0; i < steps.length; i++) {
        const stepDto = createMilestoneDto.steps[i];
        if (stepDto.next_step_id) {
          const nextStep = steps.find(s => s.id === stepDto.next_step_id);
          if (nextStep) {
            steps[i].next_step = nextStep;
            await queryRunner.manager.save(steps[i]);
          }
        }
      }

      // Create life cycle milestone relationship
      await queryRunner.manager
        .createQueryBuilder()
        .relation(LifeCycle, 'milestones')
        .of(lifeCycle)
        .add(milestone);

      await queryRunner.commitTransaction();

      return await this.findOne(milestone.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(): Promise<Milestone[]> {
    return await this.milestoneRepository.find({
      relations: ['steps']
    });
  }

  async findOne(id: string): Promise<Milestone> {
    const milestone = await this.milestoneRepository.findOne({
      where: { id },
      relations: ['steps']
    });

    if (!milestone) {
      throw new NotFoundException(`Milestone with ID ${id} not found`);
    }

    return milestone;
  }

  async update(id: string, updateMilestoneDto: UpdateMilestoneDto): Promise<Milestone> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const milestone = await this.findOne(id);

      // Update basic milestone info
      if (updateMilestoneDto.name) milestone.name = updateMilestoneDto.name;
      if (updateMilestoneDto.icon) milestone.icon = updateMilestoneDto.icon;
      await queryRunner.manager.save(milestone);

      if (updateMilestoneDto.life_cycle_id) {
        const lifeCycle = await this.lifeCycleRepository.findOne({
          where: { id: updateMilestoneDto.life_cycle_id }
        });

        if (!lifeCycle) {
          throw new NotFoundException(`Life cycle with ID ${updateMilestoneDto.life_cycle_id} not found`);
        }

        // Update life cycle relationship
        await queryRunner.manager
          .createQueryBuilder()
          .relation(LifeCycle, 'milestones')
          .of(lifeCycle)
          .add(milestone);
      }

      if (updateMilestoneDto.steps) {
        // Delete existing steps
        await queryRunner.manager.delete(MilestoneStep, { milestone: { id } });

        // Create new steps
        const steps = await Promise.all(
          updateMilestoneDto.steps.map(async (stepDto) => {
            const step = this.milestoneStepRepository.create({
              milestone: milestone,
              name: stepDto.name,
              position: stepDto.order
            });
            return await queryRunner.manager.save(step);
          })
        );

        // Update next_step references
        for (let i = 0; i < steps.length; i++) {
          const stepDto = updateMilestoneDto.steps[i];
          if (stepDto.next_step_id) {
            const nextStep = steps.find(s => s.id === stepDto.next_step_id);
            if (nextStep) {
              steps[i].next_step = nextStep;
              await queryRunner.manager.save(steps[i]);
            }
          }
        }
      }

      await queryRunner.commitTransaction();

      return await this.findOne(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: string): Promise<void> {
    const milestone = await this.findOne(id);

    // Delete all steps first
    await this.milestoneStepRepository.delete({ milestone: { id } });

    // Then delete the milestone
    await this.milestoneRepository.remove(milestone);
  }
}