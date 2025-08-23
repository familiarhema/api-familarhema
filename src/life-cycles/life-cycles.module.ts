import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LifeCyclesService } from './life-cycles.service';
import { LifeCyclesController } from './life-cycles.controller';
import { LifeCycle } from '../entities/life-cycle.entity';
import { MilestoneRole } from '../entities/milestone-role.entity';
import { LifeCycleMilestone } from '../entities/life-cycle-milestone.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LifeCycle, MilestoneRole, LifeCycleMilestone])],
  controllers: [LifeCyclesController],
  providers: [LifeCyclesService],
  exports: [LifeCyclesService],
})
export class LifeCyclesModule {}