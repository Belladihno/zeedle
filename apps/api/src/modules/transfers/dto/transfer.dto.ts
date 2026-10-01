import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator';

export class TransferDto {
  @IsUUID()
  recipientId: string;

  @IsInt()
  @Min(100)
  @Max(10000000)
  amount: number;

  @IsString()
  @Matches(/^\d{4}$/, { message: 'PIN must be exactly 4 digits' })
  pin: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  @Transform(({ value }) => value?.trim())
  narration?: string;
}
