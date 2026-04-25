import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('locations')
export class Location {
  @PrimaryColumn('text')
  id: string;

  @Column({ type: 'text', nullable: true })
  name?: string;
}
