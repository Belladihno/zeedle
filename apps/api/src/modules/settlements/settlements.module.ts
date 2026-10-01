import { Module } from '@nestjs/common';
import { SettlementsController } from './settlements.controller.js';
import { SettlementsRepository } from './settlements.repository.js';
import { SettlementsService } from './settlements.service.js';

@Module({
  controllers: [SettlementsController],
  providers: [SettlementsService, SettlementsRepository],
})
export class SettlementsModule {}
