export class BalanceUpsertDto {
  employeeId: string;
  locationId: string;
  availableDays: number;
}

export class BatchBalanceUpsertDto {
  balances: BalanceUpsertDto[];
}
