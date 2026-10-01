import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Notification } from './entities/notification.entity.js';

export interface NewNotification {
  userId: string;
  title: string;
  body: string;
  type: 'CREDIT' | 'DEBIT' | 'SYSTEM';
  relatedTransactionId?: string | null;
}


@Injectable()
export class NotificationsRepository {
  constructor(private readonly db: DataSource) {}

  create(data: NewNotification): Promise<Notification> {
    const repo = this.db.getRepository(Notification);
    return repo.save(repo.create({ ...data, relatedTransactionId: data.relatedTransactionId ?? null }));
  }

  async listForUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ items: Notification[]; total: number; unread: number }> {
    const repo = this.db.getRepository(Notification);
    const [items, total] = await repo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    const unread = await repo.countBy({ userId, isRead: false });
    return { items, total, unread };
  }

  async markRead(userId: string, id: string): Promise<Notification> {
    const repo = this.db.getRepository(Notification);
    const result = await repo.update({ id, userId }, { isRead: true });
    if (!result.affected) {
      throw new NotFoundException('Notification not found');
    }
    const updated = await repo.findOneBy({ id });
    if (!updated) throw new NotFoundException('Notification not found');
    return updated;
  }
}
