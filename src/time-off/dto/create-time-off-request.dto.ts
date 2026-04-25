import { Type } from 'class-transformer';
import { IsNumber, IsPositive, IsString } from 'class-validator';

export class CreateTimeOffRequestDto {
  @IsString()
  employeeId: string;

  @IsString()
  locationId: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  daysRequested: number;

  @IsString()
  idempotencyKey: string;
}
