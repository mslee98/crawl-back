import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionPlan } from '../entities/subscription-plan.entity';

const DEFAULT_PLANS: Pick<SubscriptionPlan, 'name' | 'durationDays' | 'price'>[] = [
  { name: '한달 구독', durationDays: 30, price: '1000000' },
];

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(
    @InjectRepository(SubscriptionPlan)
    private readonly planRepository: Repository<SubscriptionPlan>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedSubscriptionPlans();
  }

  async seedSubscriptionPlans(): Promise<void> {
    const count = await this.planRepository.count();
    if (count > 0) return;

    await this.planRepository.insert(
      DEFAULT_PLANS.map((p) => ({
        name: p.name,
        durationDays: p.durationDays,
        price: p.price,
      })),
    );
  }
}
