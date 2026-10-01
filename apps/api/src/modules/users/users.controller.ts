import { Body, Controller, Delete, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { ChangePinDto } from './dto/change-pin.dto.js';
import { PinDto } from './dto/pin.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UsersService } from './users.service.js';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  getProfile(@CurrentUser('sub') userId: string): Promise<unknown> {
    return this.users.getProfile(userId);
  }

  @Patch('me')
  updateProfile(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateProfileDto,
  ): Promise<unknown> {
    return this.users.updateProfile(userId, dto);
  }

  @Post('pin')
  createPin(@CurrentUser('sub') userId: string, @Body() dto: PinDto): Promise<{ message: string }> {
    return this.users.createPin(userId, dto.pin);
  }

  @Patch('pin')
  changePin(
    @CurrentUser('sub') userId: string,
    @Body() dto: ChangePinDto,
  ): Promise<{ message: string }> {
    return this.users.changePin(userId, dto.currentPin, dto.newPin);
  }

  @Delete('me')
  deleteAccount(@CurrentUser('sub') userId: string): Promise<{ message: string }> {
    return this.users.deleteAccount(userId);
  }
}
