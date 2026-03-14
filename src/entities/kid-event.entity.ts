import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('kid_events')
export class KidEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  name: string;
}