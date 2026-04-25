import { SyncService } from './sync.service';

describe('SyncService', () => {
  const balanceRepo = {
    upsert: jest.fn(),
    findOneOrFail: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns zero for empty batch', async () => {
    const service = new SyncService(balanceRepo as never);

    await expect(service.upsertBatch([])).resolves.toEqual({ upserted: 0 });
    expect(balanceRepo.upsert).not.toHaveBeenCalled();
  });

  it('upserts batch balances', async () => {
    const service = new SyncService(balanceRepo as never);

    await expect(
      service.upsertBatch([
        { employeeId: 'e1', locationId: 'l1', availableDays: 3 },
        { employeeId: 'e1', locationId: 'l2', availableDays: 6 },
      ]),
    ).resolves.toEqual({ upserted: 2 });

    expect(balanceRepo.upsert).toHaveBeenCalledTimes(1);
  });

  it('upserts single balance and returns saved row', async () => {
    const service = new SyncService(balanceRepo as never);
    balanceRepo.findOneOrFail.mockResolvedValue({ employeeId: 'e1', locationId: 'l1', availableDays: 9 });

    await expect(
      service.upsertSingle({ employeeId: 'e1', locationId: 'l1', availableDays: 9 }),
    ).resolves.toMatchObject({ employeeId: 'e1', locationId: 'l1', availableDays: 9 });
  });
});
