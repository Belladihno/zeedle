import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module.js';
import { SettlementsController } from './settlements.controller.js';
import { SettlementsRepository } from './settlements.repository.js';
import { SettlementsService } from './settlements.service.js';

@Module({
  imports: [AdminModule],
  controllers: [SettlementsController],
  providers: [SettlementsService, SettlementsRepository],
})
export class SettlementsModule {}
