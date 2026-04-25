import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Employee } from './time-off/entities/employee.entity';
import { Location } from './time-off/entities/location.entity';
import { TimeOffBalance } from './time-off/entities/time-off-balance.entity';
import { TimeOffRequest } from './time-off/entities/time-off-request.entity';
import { SyncModule } from './sync/sync.module';
import { TimeOffModule } from './time-off/time-off.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: process.env.DATABASE_FILE || process.env.DB_PATH || 'data.sqlite',
      entities: [Employee, Location, TimeOffBalance, TimeOffRequest],
      synchronize: true,
    }),
    HttpModule,
    TimeOffModule,
    SyncModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
