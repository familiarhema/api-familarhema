import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Milestone } from './milestone.entity';
import { Role } from './role.entity';

export enum AccessType {
  VISUALIZAR = 'visualizar',
  EDITAR = 'editar',
  ACOMPANHAR = 'acompanhar'
}

@Entity('milestone_roles')
export class MilestoneRole {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Milestone)
  @JoinColumn({ name: 'milestone_id' })
  milestone: Milestone;

  @ManyToOne(() => Role)
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @Column({
    type: 'enum',
    enum: AccessType
  })
  access_type: AccessType;

  @CreateDateColumn()
  created_at: Date;
}