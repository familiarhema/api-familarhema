import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Person } from './person.entity';
import { Milestone } from './milestone.entity';
import { MilestoneStep } from './milestone-step.entity';
import { User } from './user.entity';

export enum TrackStatus {
  ATIVO = 'ativo',
  PAUSADO = 'pausado',
  CONCLUIDO = 'concluido',
  DESCONTINUADO = 'descontinuado'
}

@Entity('milestone_step_tracks')
export class MilestoneStepTrack {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Person)
  @JoinColumn({ name: 'person_id' })
  person: Person;

  @ManyToOne(() => Milestone)
  @JoinColumn({ name: 'milestone_id' })
  milestone: Milestone;

  @ManyToOne(() => MilestoneStep)
  @JoinColumn({ name: 'milestone_step_id' })
  milestone_step: MilestoneStep;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'responsible_user_id' })
  responsible_user: User;

  @Column({
    type: 'enum',
    enum: TrackStatus
  })
  status: TrackStatus;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({ type: 'timestamp', nullable: true })
  last_updated: Date;

  @CreateDateColumn()
  created_at: Date;
}