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

  @ManyToOne(() => Cell)
  @JoinColumn({ name: 'cell_id' })
  cell: Cell;
}