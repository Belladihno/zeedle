import { IsOptional, Matches } from 'class-validator';

export class TransactionSummaryQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'Month must be YYYY-MM' })
  month?: string;
}
