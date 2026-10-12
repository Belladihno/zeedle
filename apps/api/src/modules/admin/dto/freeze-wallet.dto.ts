import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

export class FreezeWalletDto {
  @IsEnum(['FREEZE', 'UNFREEZE'])
  action: 'FREEZE' | 'UNFREEZE';

  @IsString()
  @MinLength(5, { message: 'A reason of at least 5 characters is required' })
  @MaxLength(280)
  reason: string;
}
