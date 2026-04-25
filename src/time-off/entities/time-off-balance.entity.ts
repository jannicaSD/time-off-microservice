import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('time_off_balances')
@Index(['employeeId', 'locationId'], { unique: true })
export class TimeOffBalance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  employeeId: string;

  @Column('text')
  locationId: string;

  @Column('float')
  availableDays: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
