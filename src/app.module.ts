import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Employee } from './time-off/entities/employee.entity';
import { Location } from './time-off/entities/location.entity';
import { TimeOffBalance } from './time-off/entities/time-off-balance.entity';
import { TimeOffRequestHistory } from './time-off/entities/time-off-request-history.entity';
import { TimeOffRequest } from './time-off/entities/time-off-request.entity';
import { SyncModule } from './sync/sync.module';
import { TimeOffModule } from './time-off/time-off.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'sqlite',
        database: process.env.DATABASE_FILE || process.env.DB_PATH || 'data.sqlite',
        entities: [Employee, Location, TimeOffBalance, TimeOffRequest, TimeOffRequestHistory],
        synchronize: true,
      }),
    }),
    HttpModule,
    TimeOffModule,
    SyncModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
