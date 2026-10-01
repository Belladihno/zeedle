import { Exclude } from 'class-transformer';
import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { TimestampedEntity } from '../../../common/entities/timestamped.entity.js';
import { User } from './user.entity.js';

@Entity('transaction_pins')
export class TransactionPin extends TimestampedEntity {
  @Column('uuid', { unique: true })
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Exclude()
  @Column()
  pinHash: string;

  @Column({ default: 0 })
  failedAttempts: number;

  @Column({ type: 'timestamptz', nullable: true })
  lockedUntil: Date | null;
}
