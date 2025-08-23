import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Person } from './person.entity';
import { Course } from './course.entity';

export enum CourseStatus {
  EM_ANDAMENTO = 'em_andamento',
  CONCLUIDO = 'concluido',
  DESISTIU = 'desistiu',
  TRANSFERIDO = 'transferido'
}

@Entity('person_courses')
export class PersonCourse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Person)
  @JoinColumn({ name: 'person_id' })
  person: Person;

  @ManyToOne(() => Course)
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Column({ type: 'date', nullable: true })
  start_date: Date;

  @Column({ type: 'date', nullable: true })
  end_date: Date;

  @Column({
    type: 'enum',
    enum: CourseStatus
  })
  status: CourseStatus;

  @Column({ type: 'text', nullable: true })
  note: string;

  @CreateDateColumn()
  created_at: Date;
}