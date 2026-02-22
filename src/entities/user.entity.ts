import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RefreshToken } from './refresh-token.entity';
import { SubscriptionKey } from './subscription-key.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  /** 로그인 ID (예: lms980321). 필수, 유일 */
  @Column({ type: 'varchar', length: 100, unique: true, nullable: false })
  id: string;

  /** 이메일. 필수, 유일 */
  @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
  email: string;

  @Column({ type: 'varchar', length: 255, name: 'password_hash', nullable: false })
  passwordHash: string;

  /** 닉네임. 필수, 유일 */
  @Column({ type: 'varchar', length: 100, unique: true, nullable: false })
  nickname: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;

  @OneToMany(() => RefreshToken, (rt) => rt.user)
  refreshTokens: RefreshToken[];

  @OneToMany(() => SubscriptionKey, (sk) => sk.user)
  subscriptionKeys: SubscriptionKey[];
}
