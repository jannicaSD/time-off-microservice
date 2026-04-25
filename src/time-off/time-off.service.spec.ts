import { ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HcmClient } from '../sync/hcm.client';
import { TimeOffBalance } from './entities/time-off-balance.entity';
import { TimeOffRequestHistory } from './entities/time-off-request-history.entity';
import { TimeOffRequest, TimeOffRequestStatus } from './entities/time-off-request.entity';
import { TimeOffService } from './time-off.service';

describe('TimeOffService', () => {
  let service: TimeOffService;

  const requestRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const balanceRepo = {
    find: jest.fn(),
  };

  const historyRepo = {
    create: jest.fn((value) => value),
    save: jest.fn(),
  };

  const hcmClient = {
    getBalance: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    requestRepo.save.mockImplementation(async (entity: TimeOffRequest) => entity);
    historyRepo.save.mockImplementation(async (entity) => entity);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimeOffService,
        {
          provide: getRepositoryToken(TimeOffRequest),
          useValue: requestRepo,
        },
        {
          provide: getRepositoryToken(TimeOffBalance),
          useValue: balanceRepo,
        },
        {
          provide: getRepositoryToken(TimeOffRequestHistory),
          useValue: historyRepo,
        },
        {
          provide: HcmClient,
          useValue: hcmClient,
        },
      ],
    }).compile();

    service = module.get<TimeOffService>(TimeOffService);
  });

  it('returns existing request for idempotent key', async () => {
    const existing = { id: 'r1', employeeId: 'e1', idempotencyKey: 'same' } as TimeOffRequest;
    requestRepo.findOne.mockResolvedValue(existing);

    const result = await service.createRequest({
      employeeId: 'e1',
      locationId: 'l1',
      daysRequested: 2,
      idempotencyKey: 'same',
    });

    expect(result).toBe(existing);
    expect(hcmClient.getBalance).not.toHaveBeenCalled();
  });

  it('creates request when balance is sufficient', async () => {
    requestRepo.findOne.mockResolvedValue(null);
    hcmClient.getBalance.mockResolvedValue({ availableDays: 10 });
    requestRepo.create.mockReturnValue({
      employeeId: 'e1',
      locationId: 'l1',
      daysRequested: 2,
      status: TimeOffRequestStatus.SUBMITTED,
      idempotencyKey: 'key-1',
    });
    requestRepo.save.mockImplementation(async (entity: TimeOffRequest) => ({
      ...entity,
      id: 'new-id',
    }));

    const result = await service.createRequest({
      employeeId: 'e1',
      locationId: 'l1',
      daysRequested: 2,
      idempotencyKey: 'key-1',
    });

    expect(result.status).toBe(TimeOffRequestStatus.SUBMITTED);
    expect(result.id).toBe('new-id');
  });

  it('throws 409 when balance is insufficient', async () => {
    requestRepo.findOne.mockResolvedValue(null);
    hcmClient.getBalance.mockResolvedValue({ availableDays: 1 });

    await expect(
      service.createRequest({
        employeeId: 'e1',
        locationId: 'l1',
        daysRequested: 2,
        idempotencyKey: 'key-2',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws 503 when hcm validation is unavailable', async () => {
    requestRepo.findOne.mockResolvedValue(null);
    hcmClient.getBalance.mockResolvedValue(null);

    await expect(
      service.createRequest({
        employeeId: 'e1',
        locationId: 'l1',
        daysRequested: 2,
        idempotencyKey: 'key-3',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('approves a submitted request and records history', async () => {
    requestRepo.findOne.mockResolvedValue({
      id: 'req-1',
      employeeId: 'e1',
      locationId: 'l1',
      status: TimeOffRequestStatus.SUBMITTED,
    });

    const result = await service.approveRequest('req-1');

    expect(result.status).toBe(TimeOffRequestStatus.APPROVED);
    expect(historyRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'req-1',
        oldStatus: TimeOffRequestStatus.SUBMITTED,
        newStatus: TimeOffRequestStatus.APPROVED,
      }),
    );
  });

  it('rejects a submitted request and records reason', async () => {
    requestRepo.findOne.mockResolvedValue({
      id: 'req-2',
      employeeId: 'e1',
      locationId: 'l1',
      status: TimeOffRequestStatus.SUBMITTED,
    });

    const result = await service.rejectRequest('req-2', 'manager declined');

    expect(result.status).toBe(TimeOffRequestStatus.REJECTED);
    expect(historyRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'req-2',
        newStatus: TimeOffRequestStatus.REJECTED,
        reason: 'manager declined',
      }),
    );
  });

  it('cancels a submitted request', async () => {
    requestRepo.findOne.mockResolvedValue({
      id: 'req-3',
      employeeId: 'e1',
      locationId: 'l1',
      status: TimeOffRequestStatus.SUBMITTED,
    });

    const result = await service.cancelRequest('req-3');

    expect(result.status).toBe(TimeOffRequestStatus.CANCELLED);
    expect(historyRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'req-3',
        newStatus: TimeOffRequestStatus.CANCELLED,
      }),
    );
  });

  it('marks an approved request as sync failed when reconciliation fails', async () => {
    requestRepo.findOne.mockResolvedValue({
      id: 'req-4',
      employeeId: 'e1',
      locationId: 'l1',
      status: TimeOffRequestStatus.APPROVED,
    });
    hcmClient.getBalance.mockResolvedValue(null);

    const result = await service.validateApprovedRequest('req-4');

    expect(result).toBe(false);
    expect(historyRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'req-4',
        newStatus: TimeOffRequestStatus.SYNC_FAILED,
      }),
    );
  });
});
