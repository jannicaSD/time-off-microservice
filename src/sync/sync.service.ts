import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BalanceUpsertDto } from './dto/balance-upsert.dto';
import { TimeOffBalance } from '../time-off/entities/time-off-balance.entity';

@Injectable()
export class SyncService {
  constructor(
    @InjectRepository(TimeOffBalance)
    private readonly balanceRepo: Repository<TimeOffBalance>,
  ) {}

  async upsertBatch(balances: BalanceUpsertDto[]): Promise<{ upserted: number }> {
    if (!balances?.length) {
      return { upserted: 0 };
    }

    await this.balanceRepo.upsert(balances, ['employeeId', 'locationId']);
    return { upserted: balances.length };
  }

  async upsertSingle(balance: BalanceUpsertDto): Promise<TimeOffBalance> {
    await this.balanceRepo.upsert(balance, ['employeeId', 'locationId']);
    return this.balanceRepo.findOneOrFail({
      where: {
        employeeId: balance.employeeId,
        locationId: balance.locationId,
      },
    });
  }
}
