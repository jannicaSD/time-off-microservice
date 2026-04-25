import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum TimeOffRequestStatus {
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  SYNC_FAILED = 'SYNC_FAILED',
}

@Entity('time_off_requests')
@Index(['employeeId', 'idempotencyKey'], { unique: true })
export class TimeOffRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  employeeId: string;

  @Column('text')
  locationId: string;

  @Column('float')
  daysRequested: number;

  @Column({ type: 'text' })
  status: TimeOffRequestStatus;

  @Column('text')
  idempotencyKey: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
