import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

export interface HcmBalance {
  employeeId: string;
  locationId: string;
  availableDays: number;
}

@Injectable()
export class HcmClient {
  private readonly hcmBaseUrl = process.env.HCM_BASE_URL || 'http://localhost:3001';
  private readonly maxRetries = Number(process.env.HCM_MAX_RETRIES || 3);
  private readonly timeoutMs = Number(process.env.HCM_TIMEOUT_MS || 1500);

  constructor(private readonly httpService: HttpService) {}

  async getBalance(employeeId: string, locationId: string): Promise<HcmBalance | null> {
    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      try {
        const response = await firstValueFrom(
          this.httpService.get<HcmBalance>(`${this.hcmBaseUrl}/hcm/balances`, {
            params: { employeeId, locationId },
            timeout: this.timeoutMs,
          }),
        );

        if (
          !response.data ||
          typeof response.data.availableDays !== 'number' ||
          Number.isNaN(response.data.availableDays)
        ) {
          return null;
        }

        return response.data;
      } catch (error) {
        const lastAttempt = attempt === this.maxRetries;
        if (lastAttempt || !this.isTransientError(error)) {
          return null;
        }
        await this.delay(100 * 2 ** attempt);
      }
    }

    return null;
  }

  private isTransientError(error: unknown): boolean {
    const axiosError = error as AxiosError | undefined;

    if (!axiosError) {
      return false;
    }

    if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ECONNRESET') {
      return true;
    }

    const status = axiosError.response?.status;
    return typeof status === 'number' && status >= 500;
  }

  private async delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
