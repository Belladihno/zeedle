import { IsInt, Max, Min } from 'class-validator';

export class FundWalletDto {
  @IsInt()
  @Min(100)
  @Max(10000000)
  amount: number;
}
