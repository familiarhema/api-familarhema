import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('volunteers')
export class Volunteer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  name: string;

  @Column({ length: 150 })
  email: string;

  @Column({ length: 50 })
  phone: string;

  @Column({ type: 'enum', enum: ['Active', 'Inactive', 'Shadow'], default: 'Active' })
  status: string;

  @CreateDateColumn()
  registration_date: Date;

  @Column({ nullable: true })
  photo: string;

  @Column({ type: 'date', nullable: true })
  birth_date: Date;

  @Column({ name: 'person_id', type: 'integer', nullable: true })
  personId: number;
}