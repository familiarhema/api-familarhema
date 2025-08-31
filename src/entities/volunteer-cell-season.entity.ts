import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Volunteer } from './volunteer.entity';
import { Cell } from './cell.entity';
import { Season } from './season.entity';

@Entity('volunteer_cell_seasons')
export class VolunteerCellSeason {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Volunteer)
  @JoinColumn({ name: 'volunteer_id' })
  volunteer: Volunteer;

  @ManyToOne(() => Cell)
  @JoinColumn({ name: 'cell_id' })
  cell: Cell;

  @ManyToOne(() => Season)
  @JoinColumn({ name: 'season_id' })
  season: Season;
}