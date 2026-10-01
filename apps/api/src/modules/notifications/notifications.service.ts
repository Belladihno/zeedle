import { Injectable } from '@nestjs/common';
import type { Notification } from './entities/notification.entity.js';
import { NotificationsRepository, type NewNotification } from './notifications.repository.js';

@Injectable()
export class NotificationsService {
  constructor(private readonly notifications: NotificationsRepository) {}
  
  notify(data: NewNotification): Promise<Notification> {
    return this.notifications.create(data);
  }

  list(userId: string, page: number, limit: number): Promise<{
    items: Notification[];
    total: number;
    unread: number;
  }> {
    return this.notifications.listForUser(userId, page, limit);
  }

  markRead(userId: string, id: string): Promise<Notification> {
    return this.notifications.markRead(userId, id);
  }
}
