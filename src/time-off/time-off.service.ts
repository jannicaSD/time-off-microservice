import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HcmClient } from '../sync/hcm.client';
import { CreateTimeOffRequestDto } from './dto/create-time-off-request.dto';
import { TimeOffBalance } from './entities/time-off-balance.entity';
import {
  TimeOffRequest,
  TimeOffRequestStatus,
} from './entities/time-off-request.entity';

@Injectable()
export class TimeOffService {
  constructor(
    @InjectRepository(TimeOffRequest)
    private readonly requestRepo: Repository<TimeOffRequest>,
    @InjectRepository(TimeOffBalance)
    private readonly balanceRepo: Repository<TimeOffBalance>,
    private readonly hcmClient: HcmClient,
  ) {}

  async createRequest(dto: CreateTimeOffRequestDto): Promise<TimeOffRequest> {
    if (!dto.employeeId || !dto.locationId || !dto.idempotencyKey || dto.daysRequested <= 0) {
      throw new BadRequestException('Invalid request parameters');
    }

    const existing = await this.requestRepo.findOne({
      where: {
        employeeId: dto.employeeId,
        idempotencyKey: dto.idempotencyKey,
      },
    });

    if (existing) {
      return existing;
    }

    const hcmBalance = await this.hcmClient.getBalance(dto.employeeId, dto.locationId);

    if (!hcmBalance) {
      throw new ServiceUnavailableException('Unable to validate balance with HCM');
    }

    if (hcmBalance.availableDays < dto.daysRequested) {
      throw new ConflictException('Insufficient balance');
    }

    const request = this.requestRepo.create({
      employeeId: dto.employeeId,
      locationId: dto.locationId,
      daysRequested: dto.daysRequested,
      status: TimeOffRequestStatus.SUBMITTED,
      idempotencyKey: dto.idempotencyKey,
    });

    return this.requestRepo.save(request);
  }

  async approveRequest(requestId: string): Promise<TimeOffRequest> {
    const request = await this.requestRepo.findOne({ where: { id: requestId } });

    if (!request) {
      throw new BadRequestException('Request not found');
    }

    request.status = TimeOffRequestStatus.APPROVED;
    return this.requestRepo.save(request);
  }

  async getBalances(employeeId?: string): Promise<TimeOffBalance[]> {
    if (!employeeId) {
      return this.balanceRepo.find();
    }

    return this.balanceRepo.find({ where: { employeeId } });
  }
}
