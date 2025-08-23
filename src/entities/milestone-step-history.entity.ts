import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Person } from './person.entity';
import { Milestone } from './milestone.entity';
import { MilestoneStep } from './milestone-step.entity';
import { User } from './user.entity';

@Entity('milestone_step_history')
export class MilestoneStepHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Person)
  @JoinColumn({ name: 'person_id' })
  person: Person;

  @ManyToOne(() => Milestone)
  @JoinColumn({ name: 'milestone_id' })
  milestone: Milestone;

  @ManyToOne(() => MilestoneStep)
  @JoinColumn({ name: 'from_step_id' })
  from_step: MilestoneStep;

  @ManyToOne(() => MilestoneStep)
  @JoinColumn({ name: 'to_step_id' })
  to_step: MilestoneStep;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'moved_by_user_id' })
  moved_by_user: User;

  @Column({ type: 'timestamp' })
  moved_at: Date;

  @Column({ type: 'text', nullable: true })
  note: string;
}