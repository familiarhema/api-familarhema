import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { LifeCycle } from './life-cycle.entity';
import { Milestone } from './milestone.entity';

@Entity('life_cycle_milestones')
export class LifeCycleMilestone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => LifeCycle, lifeCycle => lifeCycle.life_cycle_milestones)
  @JoinColumn({ name: 'life_cycle_id' })
  life_cycle: LifeCycle;

  @ManyToOne(() => Milestone, milestone => milestone.life_cycle_milestones)
  @JoinColumn({ name: 'milestone_id' })
  milestone: Milestone;

  @Column({ type: 'integer', nullable: true })
  position: number;

  @CreateDateColumn()
  created_at: Date;
}