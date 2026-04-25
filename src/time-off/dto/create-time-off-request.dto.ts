export class CreateTimeOffRequestDto {
  employeeId: string;
  locationId: string;
  daysRequested: number;
  idempotencyKey: string;
}
