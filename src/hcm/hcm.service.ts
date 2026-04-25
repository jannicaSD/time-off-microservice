import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { HcmUnavailableError } from './hcm.errors';

export interface HcmBalanceResponse {
  employeeId: string;
  locationId: string;
  availableDays: number;
}

@Injectable()
export class HcmService {
  private readonly baseUrl = process.env.HCM_BASE_URL || 'http://localhost:4100';
  private readonly maxRetries = Number(process.env.HCM_MAX_RETRIES || 3);
  private readonly timeoutMs = Number(process.env.HCM_TIMEOUT_MS || 1500);

  constructor(private readonly httpService: HttpService) {}

  async getBalance(employeeId: string, locationId: string): Promise<HcmBalanceResponse> {
    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      try {
        const response = await firstValueFrom(
          this.httpService.get<HcmBalanceResponse>(`${this.baseUrl}/hcm/balances`, {
            params: { employeeId, locationId },
            timeout: this.timeoutMs,
          }),
        );

        if (
          !response.data ||
          typeof response.data.availableDays !== 'number' ||
          Number.isNaN(response.data.availableDays)
        ) {
          throw new HcmUnavailableError('HCM response did not include a valid balance');
        }

        return response.data;
      } catch (error) {
        const isLastAttempt = attempt === this.maxRetries;
        if (!this.isTransientError(error) || isLastAttempt) {
          throw new HcmUnavailableError();
        }
        await this.delay(100 * 2 ** attempt);
      }
    }

    throw new HcmUnavailableError();
  }

  private isTransientError(error: unknown): boolean {
    const axiosError = error as AxiosError | undefined;

    if (!axiosError) {
      return false;
    }

    if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ECONNRESET') {
      return true;
    }

    if (typeof axiosError.status === 'number' && axiosError.status >= 500) {
      return true;
    }

    const responseStatus = axiosError.response?.status;
    return typeof responseStatus === 'number' && responseStatus >= 500;
  }

  private async delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
