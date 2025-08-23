import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MilestonesService } from './milestones.service';
import { MilestonesController } from './milestones.controller';
import { Milestone } from '../entities/milestone.entity';
import { MilestoneStep } from '../entities/milestone-step.entity';
import { LifeCycle } from '../entities/life-cycle.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Milestone, MilestoneStep, LifeCycle])],
  controllers: [MilestonesController],
  providers: [MilestonesService],
  exports: [MilestonesService],
})
export class MilestonesModule {}