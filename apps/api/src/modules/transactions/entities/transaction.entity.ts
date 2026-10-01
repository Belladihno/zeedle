import { TransactionSource, TransactionStatus, TransactionType } from '@zeedle/shared-types';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { koboTransformer } from '../../../common/utils/kobo.transformer.js';
import { uuidv7 } from '../../../common/utils/uuidv7.js';
import type { Settlement } from '../../settlements/entities/settlement.entity.js';
import { Wallet } from '../../wallets/entities/wallet.entity.js';

// No updatedAt — transaction records are never modified after creation.
@Entity('transactions')
@Index(['walletId'])
@Index(['referenceId'])
@Index(['createdAt'])
@Index(['status', 'settlementId'])
export class Transaction {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  walletId: string;

  @ManyToOne(() => Wallet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'walletId' })
  wallet: Wallet;

  @Column({ type: 'enum', enum: Object.values(TransactionType) })
  type: TransactionType;

  @Column({ type: 'enum', enum: Object.values(TransactionStatus), default: TransactionStatus.PENDING })
  status: TransactionStatus;

  @Column({ type: 'enum', enum: Object.values(TransactionSource) })
  source: TransactionSource;

  @Column({ type: 'bigint', transformer: koboTransformer })
  amount: number;

  @Column({ type: 'bigint', transformer: koboTransformer, default: 0 })
  fee: number;

  @Column({ type: 'bigint', transformer: koboTransformer })
  balanceBefore: number;

  @Column({ type: 'bigint', transformer: koboTransformer })
  balanceAfter: number;

  @Column()
  referenceId: string;

  @Column({ nullable: true })
  externalReference: string | null;

  @Column({ nullable: true })
  narration: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column('uuid', { nullable: true })
  settlementId: string | null;

  @ManyToOne('Settlement', 'transactions')
  @JoinColumn({ name: 'settlementId' })
  settlement: Settlement | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @BeforeInsert()
  assignId(): void {
    if (!this.id) {
      this.id = uuidv7();
    }
  }
}
