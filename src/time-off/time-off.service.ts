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
import { TimeOffRequestHistory } from './entities/time-off-request-history.entity';
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
    @InjectRepository(TimeOffRequestHistory)
    private readonly historyRepo: Repository<TimeOffRequestHistory>,
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
    const request = await this.findRequestOrThrow(requestId);

    if (request.status !== TimeOffRequestStatus.SUBMITTED) {
      throw new ConflictException('Only submitted requests can be approved');
    }

    return this.transitionRequestStatus(request, TimeOffRequestStatus.APPROVED);
  }

  async rejectRequest(requestId: string, reason?: string): Promise<TimeOffRequest> {
    const request = await this.findRequestOrThrow(requestId);

    if (request.status !== TimeOffRequestStatus.SUBMITTED) {
      throw new ConflictException('Only submitted requests can be rejected');
    }

    return this.transitionRequestStatus(request, TimeOffRequestStatus.REJECTED, reason);
  }

  async cancelRequest(requestId: string): Promise<TimeOffRequest> {
    const request = await this.findRequestOrThrow(requestId);

    if (request.status !== TimeOffRequestStatus.SUBMITTED) {
      throw new ConflictException('Only submitted requests can be cancelled');
    }

    return this.transitionRequestStatus(request, TimeOffRequestStatus.CANCELLED);
  }

  async validateApprovedRequest(requestId: string): Promise<boolean> {
    const request = await this.findRequestOrThrow(requestId);

    if (request.status !== TimeOffRequestStatus.APPROVED) {
      throw new ConflictException('Only approved requests can be reconciled');
    }

    const currentBalance = await this.hcmClient.getBalance(request.employeeId, request.locationId);

    if (!currentBalance || currentBalance.availableDays < 0) {
      await this.transitionRequestStatus(
        request,
        TimeOffRequestStatus.SYNC_FAILED,
        'HCM balance reconciliation failed',
      );
      return false;
    }

    return true;
  }

  async getBalances(employeeId?: string): Promise<TimeOffBalance[]> {
    if (!employeeId) {
      return this.balanceRepo.find();
    }

    return this.balanceRepo.find({ where: { employeeId } });
  }

  private async findRequestOrThrow(requestId: string): Promise<TimeOffRequest> {
    const request = await this.requestRepo.findOne({ where: { id: requestId } });

    if (!request) {
      throw new BadRequestException('Request not found');
    }

    return request;
  }

  private async transitionRequestStatus(
    request: TimeOffRequest,
    newStatus: TimeOffRequestStatus,
    reason?: string,
  ): Promise<TimeOffRequest> {
    const oldStatus = request.status;
    request.status = newStatus;

    const savedRequest = await this.requestRepo.save(request);
    await this.historyRepo.save(
      this.historyRepo.create({
        requestId: savedRequest.id,
        oldStatus,
        newStatus,
        reason,
      }),
    );

    return savedRequest;
  }
}
