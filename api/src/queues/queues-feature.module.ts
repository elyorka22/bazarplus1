import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import {
  QUEUE_DEAD_LETTER,
  QUEUE_NOTIFICATION,
  QUEUE_ORDER,
} from '../common/constants';

@Global()
@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUE_ORDER },
      { name: QUEUE_NOTIFICATION },
      { name: QUEUE_DEAD_LETTER },
    ),
  ],
  exports: [BullModule],
})
export class QueuesFeatureModule {}
