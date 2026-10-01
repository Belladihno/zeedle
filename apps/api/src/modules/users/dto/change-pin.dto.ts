import { IsString, Matches } from 'class-validator';

export class ChangePinDto {
  @IsString()
  @Matches(/^\d{4}$/, { message: 'PIN must be exactly 4 digits' })
  currentPin: string;

  @IsString()
  @Matches(/^\d{4}$/, { message: 'PIN must be exactly 4 digits' })
  newPin: string;
}
