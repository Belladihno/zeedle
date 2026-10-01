import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { koboTransformer } from '../../../common/utils/kobo.transformer.js';
import { uuidv7 } from '../../../common/utils/uuidv7.js';
import type { Transaction } from '../../transactions/entities/transaction.entity.js';
import type { User } from '../../users/entities/user.entity.js';

@Entity('wallets')
export class Wallet {
  @PrimaryColumn('uuid')
  id: string;

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

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany('Transaction', 'wallet')
  transactions: Transaction[];

  @BeforeInsert()
  assignId(): void {
    if (!this.id) {
      this.id = uuidv7();
    }
  }
}
