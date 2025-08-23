import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Person } from './person.entity';

export enum ContactType {
  TELEFONE = 'telefone',
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
  OUTRO = 'outro'
}

@Entity('person_contacts')
export class PersonContact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Person)
  @JoinColumn({ name: 'person_id' })
  person: Person;

  @Column({
    type: 'enum',
    enum: ContactType
  })
  type: ContactType;

  @Column({ length: 150 })
  value: string;

  @Column({ default: false })
  is_primary: boolean;

  @CreateDateColumn()
  created_at: Date;
}