import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { User } from '../../users/entities/user.entity.js';

@Entity('notifications')
export class Notification extends BaseEntity {
  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  title: string;

  @Column()
  body: string;

  @Column({ type: 'enum', enum: ['CREDIT', 'DEBIT', 'SYSTEM'] })
  type: 'CREDIT' | 'DEBIT' | 'SYSTEM';

  @Column({ default: false })
  isRead: boolean;

  @Column('uuid', { nullable: true })
  relatedTransactionId: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
