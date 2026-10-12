import { Column, CreateDateColumn, Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';

export type AuditAction = 'SETTLEMENT_RUN' | 'WALLET_FREEZE' | 'WALLET_UNFREEZE';

/**
 * Immutable record of privileged admin actions. Rows are append-only —
 * no update or delete path exists. Reason is mandatory so every action
 * is attributable to an actor with a stated justification.
 */
@Entity('audit_logs')
export class AuditLog extends BaseEntity {
  @Column('uuid')
  actorId: string;

  @Column()
  action: AuditAction;

  @Column()
  targetType: string;

  @Column()
  targetId: string;

  @Column()
  reason: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
