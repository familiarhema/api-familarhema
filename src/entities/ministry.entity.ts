import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('ministries')
export class Ministry {
  @PrimaryColumn({ type: 'integer' })
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ default: true })
  active: boolean;
}