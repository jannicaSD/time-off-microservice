import { Body, Controller, Post } from '@nestjs/common';
import { BatchBalanceUpsertDto } from './dto/balance-upsert.dto';
import { SyncService } from './sync.service';

@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('hcm/balances')
  batchUpsert(@Body() dto: BatchBalanceUpsertDto) {
    return this.syncService.upsertBatch(dto.balances || []);
  }
}
