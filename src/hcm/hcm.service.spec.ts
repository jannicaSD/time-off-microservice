import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { HcmService } from './hcm.service';

describe('HcmService', () => {
  const httpService = {
    get: jest.fn(),
  } as unknown as HttpService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.HCM_BASE_URL = 'http://localhost:4100';
    process.env.HCM_MAX_RETRIES = '1';
    process.env.HCM_TIMEOUT_MS = '50';
  });

  it('returns balance data on success', async () => {
    const service = new HcmService(httpService);
    const response = { data: { employeeId: 'e1', locationId: 'l1', availableDays: 8 } };
    jest.spyOn(httpService, 'get').mockReturnValueOnce(of(response) as never);

    const result = await service.getBalance('e1', 'l1');

    expect(result).toEqual(response.data);
    expect(httpService.get).toHaveBeenCalledTimes(1);
  });

  it('returns null when hcm is unavailable', async () => {
    const service = new HcmService(httpService);
    jest.spyOn(httpService, 'get').mockReturnValueOnce(throwError(() => new Error('fail')) as never);

    await expect(service.getBalance('e1', 'l1')).rejects.toThrow();
  });
});
