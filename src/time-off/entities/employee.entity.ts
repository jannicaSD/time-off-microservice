import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('employees')
export class Employee {
  @PrimaryColumn('text')
  id: string;

  @Column({ type: 'text', nullable: true })
  name?: string;
}
