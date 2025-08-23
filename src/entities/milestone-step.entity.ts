import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Milestone } from './milestone.entity';

@Entity('milestone_steps')
export class MilestoneStep {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Milestone)
  @JoinColumn({ name: 'milestone_id' })
  milestone: Milestone;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'integer', nullable: true })
  position: number;

  @ManyToOne(() => MilestoneStep, { nullable: true })
  @JoinColumn({ name: 'next_step_id' })
  next_step: MilestoneStep;

  @CreateDateColumn()
  created_at: Date;
}