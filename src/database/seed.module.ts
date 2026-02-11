import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionPlan } from '../entities/subscription-plan.entity';
import { SeedService } from './seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([SubscriptionPlan])],
  providers: [SeedService],
})
export class SeedModule {}
