import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimeOffBalance } from '../time-off/entities/time-off-balance.entity';
import { HcmClient } from './hcm.client';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { WebhookController } from './webhook.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TimeOffBalance]), HttpModule],
  controllers: [SyncController, WebhookController],
  providers: [SyncService, HcmClient],
})
export class SyncModule {}
