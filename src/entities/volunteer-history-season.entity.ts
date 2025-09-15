import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Volunteer } from './volunteer.entity';
import { Cell } from './cell.entity';
import { Season } from './season.entity';

@Entity('volunteer_history_season')
export class VolunteerHistorySeason {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Volunteer)
  @JoinColumn({ name: 'volunteer_id' })
  volunteer: Volunteer;

  @ManyToOne(() => Season)
  @JoinColumn({ name: 'season_id' })
  season: Season;

  @Column({ length: 50 })
  phone: string;

  @Column({ length: 150 })
  email: string;

  @Column({ nullable: true })
  startServicedAt: number;

  @ManyToOne(() => Cell, { nullable: true })
  @JoinColumn({ name: 'cell_id' })
  cell: Cell;

  @Column({ length: 100, nullable: true, name: 'cell_name' })
  cellName: string;
}