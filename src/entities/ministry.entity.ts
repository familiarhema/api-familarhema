import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('ministries')
export class Ministry {
  @PrimaryColumn({ type: 'integer' })
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ default: true })
  active: boolean;

  @Column({ default: false })
  hideNewVolunteer: boolean;

  @Column({ default: false })
  hearing: boolean;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: false })
  onlyIndicatin: boolean;
}