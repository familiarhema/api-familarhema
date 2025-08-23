import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('cells')
export class Cell {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'leader_id' })
  leader: User;

  @Column({ type: 'integer' })
  day_of_week: number;

  @Column({ type: 'time', nullable: true })
  time: Date;

  @Column({ type: 'text', nullable: true })
  location: string;

  @CreateDateColumn()
  created_at: Date;
}