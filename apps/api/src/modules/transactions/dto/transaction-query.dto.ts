import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class TransactionQueryDto {
  @IsOptional()
  @IsEnum(['CREDIT', 'DEBIT'])
  type?: 'CREDIT' | 'DEBIT';

  @IsOptional()
  @IsEnum(['PENDING', 'SUCCESS', 'FAILED', 'REVERSED'])
  status?: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REVERSED';

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
