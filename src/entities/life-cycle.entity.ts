import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { LifeCycleMilestone } from './life-cycle-milestone.entity';

@Entity('life_cycles')
export class LifeCycle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => LifeCycleMilestone, lifeCycleMilestone => lifeCycleMilestone.life_cycle)
  life_cycle_milestones: LifeCycleMilestone[];
}