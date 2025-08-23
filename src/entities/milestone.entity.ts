import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { LifeCycleMilestone } from './life-cycle-milestone.entity';

@Entity('milestones')
export class Milestone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 50, nullable: true })
  icon: string;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => LifeCycleMilestone, lifeCycleMilestone => lifeCycleMilestone.milestone)
  life_cycle_milestones: LifeCycleMilestone[];
}