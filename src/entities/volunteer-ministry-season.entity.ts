import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Volunteer } from './volunteer.entity';
import { Ministry } from './ministry.entity';
import { Season } from './season.entity';

@Entity('volunteer_ministry_season')
export class VolunteerMinistrySeason {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Volunteer)
  @JoinColumn({ name: 'volunteer_id' })
  volunteer: Volunteer;

  @ManyToOne(() => Ministry)
  @JoinColumn({ name: 'ministry_id' })
  ministry: Ministry;

  @ManyToOne(() => Season)
  @JoinColumn({ name: 'season_id' })
  season: Season;

  @Column({
    type: 'enum',
    enum: ['Created', 'Accepted', 'Rejected', 'Integrated'],
    default: 'Created'
  })
  status: string;

  @Column({ name: 'rejection_description', type: 'text', nullable: true })
  rejectionDescription: string;

    @Column({ type: 'boolean', default: false })
  shadow: boolean;
}