import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Transform(({ value }) => value?.trim())
  firstName: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Transform(({ value }) => value?.trim())
  lastName: string;

  @IsEmail()
  @MaxLength(255)
  @Transform(({ value }) => value?.trim().toLowerCase())
  email: string;

  @IsString()
  @MinLength(7)
  @MaxLength(15)
  @Transform(({ value }) => value?.trim())
  phone: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}
