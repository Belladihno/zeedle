import { Role } from '@zeedle/shared-types';
import { Exclude } from 'class-transformer';
import { Column, Entity, OneToOne } from 'typeorm';
import { TimestampedEntity } from '../../../common/entities/timestamped.entity.js';
import type { Wallet } from '../../wallets/entities/wallet.entity.js';

@Entity('users')
export class User extends TimestampedEntity {
  @Column({ unique: true })
  email: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Exclude()
  @Column()
  passwordHash: string;

  @Column({ type: 'enum', enum: Object.values(Role), default: Role.USER })
  role: Role;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isDeleted: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @OneToOne('Wallet', 'user')
  wallet: Wallet;
}
