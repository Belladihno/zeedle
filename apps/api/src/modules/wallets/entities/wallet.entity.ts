import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { TimestampedEntity } from '../../../common/entities/timestamped.entity.js';
import { koboTransformer } from '../../../common/utils/kobo.transformer.js';
import type { Transaction } from '../../transactions/entities/transaction.entity.js';
import type { User } from '../../users/entities/user.entity.js';

@Entity('wallets')
export class Wallet extends TimestampedEntity {
  @Column({ type: 'char', length: 10, unique: true })
  accountNumber: string;

  @Column('uuid', { unique: true })
  userId: string;

  @OneToOne('User', 'wallet', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'bigint', transformer: koboTransformer, default: 0 })
  balanceKobo: number;

  @Column({ default: 'NGN' })
  currency: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany('Transaction', 'wallet')
  transactions: Transaction[];
}
