import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { AdminController } from './admin.controller.js';
import { AdminRepository } from './admin.repository.js';
import { AdminService } from './admin.service.js';

@Module({
  imports: [UsersModule],
  controllers: [AdminController],
  providers: [AdminService, AdminRepository],
  exports: [AdminRepository],
})
export class AdminModule {}
