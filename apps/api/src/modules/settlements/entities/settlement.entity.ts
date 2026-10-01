import { SettlementStatus } from '@zeedle/shared-types';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { koboTransformer } from '../../../common/utils/kobo.transformer.js';
import { uuidv7 } from '../../../common/utils/uuidv7.js';
import type { Transaction } from '../../transactions/entities/transaction.entity.js';
import { User } from '../../users/entities/user.entity.js';

@Entity('settlements')
export class Settlement {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'timestamptz' })
  periodStart: Date;

  @Column({ type: 'timestamptz' })
  periodEnd: Date;

  @Column({ type: 'bigint', transformer: koboTransformer, default: 0 })
  totalAmount: number;

  @Column({ default: 0 })
  transactionCount: number;

  @Column({ type: 'enum', enum: Object.values(SettlementStatus), default: SettlementStatus.PENDING })
  status: SettlementStatus;

  @Column('uuid')
  triggeredBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'triggeredBy' })
  triggeredByUser: User;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @OneToMany('Transaction', 'settlement')
  transactions: Transaction[];

  @BeforeInsert()
  assignId(): void {
    if (!this.id) {
      this.id = uuidv7();
    }
  }
}
