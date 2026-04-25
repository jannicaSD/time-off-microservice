import { Body, Controller, Post } from '@nestjs/common';
import { BalanceUpsertDto } from './dto/balance-upsert.dto';
import { SyncService } from './sync.service';

@Controller('sync/webhook')
export class WebhookController {
  constructor(private readonly syncService: SyncService) {}

  @Post('hcm-update')
  upsertOne(@Body() dto: BalanceUpsertDto) {
    return this.syncService.upsertSingle(dto);
  }
}
