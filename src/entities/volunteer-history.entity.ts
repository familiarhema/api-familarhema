import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Volunteer } from './volunteer.entity';
import { Cell } from './cell.entity';

@Entity('volunteer_history')
export class VolunteerHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Volunteer)
  @JoinColumn({ name: 'volunteer_id' })
  volunteer: Volunteer;

  @Column({ length: 50 })
  phone: string;

  @Column({ length: 150 })
  email: string;

  @Column({ name: 'ministry_id_1', type: 'integer' })
  ministryId1: number;

  @Column({ name: 'ministry_id_2', type: 'integer', nullable: true })
  ministryId2: number;

  @ManyToOne(() => Cell)
  @JoinColumn({ name: 'cell_id' })
  cell: Cell;
}