import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('seasons')
export class Season {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'date', name: 'data_inicio' })
  dataInicio: Date;

  @Column({ type: 'date', name: 'data_fim' })
  dataFim: Date;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'date', name: 'data_fim_prorrogacao', nullable: true })
  data_fim_prorrogacao: Date | null;

  @Column({ type: 'boolean', default: false, name: 'block_new_volunteer' })
  block_new_volunteer: boolean;
}