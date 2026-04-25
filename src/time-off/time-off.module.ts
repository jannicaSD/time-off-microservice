import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HcmClient } from '../sync/hcm.client';
import { TimeOffBalance } from './entities/time-off-balance.entity';
import { TimeOffRequestHistory } from './entities/time-off-request-history.entity';
import { TimeOffRequest } from './entities/time-off-request.entity';
import { TimeOffController } from './time-off.controller';
import { TimeOffService } from './time-off.service';

@Module({
  imports: [TypeOrmModule.forFeature([TimeOffRequest, TimeOffBalance, TimeOffRequestHistory]), HttpModule],
  controllers: [TimeOffController],
  providers: [TimeOffService, HcmClient],
  exports: [TimeOffService],
})
export class TimeOffModule {}
