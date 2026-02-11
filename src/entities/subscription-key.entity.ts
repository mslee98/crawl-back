import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';
import { SubscriptionPlan } from './subscription-plan.entity';

export type SubscriptionKeyStatus = 'active' | 'expired' | 'revoked';

@Entity('subscription_keys')
export class SubscriptionKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'char', length: 36 })
  userId: string;

  @ManyToOne(() => User, (user) => user.subscriptionKeys, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 255, unique: true })
  key: string;

  @Column({ name: 'plan_id', type: 'char', length: 36, nullable: true })
  planId: string | null;

  @ManyToOne(() => SubscriptionPlan, (plan) => plan.subscriptionKeys, {
    nullable: true,
  })
  @JoinColumn({ name: 'plan_id' })
  plan: SubscriptionPlan | null;

  @Column({ name: 'valid_from', type: 'datetime' })
  validFrom: Date;

  @Column({ name: 'valid_until', type: 'datetime' })
  validUntil: Date;

  @Column({
    type: 'enum',
    enum: ['active', 'expired', 'revoked'],
    default: 'active',
  })
  status: SubscriptionKeyStatus;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;
}
