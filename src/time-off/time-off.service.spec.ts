import { ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HcmClient } from '../sync/hcm.client';
import { TimeOffBalance } from './entities/time-off-balance.entity';
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

  const hcmClient = {
    getBalance: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

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
      id: 'new-id',
      ...entity,
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
});
