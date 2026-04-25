import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('time_off_request_history')
export class TimeOffRequestHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  requestId: string;

  @Column('text')
  oldStatus: string;

  @Column('text')
  newStatus: string;

  @Column('text', { nullable: true })
  reason?: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  changedAt: Date;
}