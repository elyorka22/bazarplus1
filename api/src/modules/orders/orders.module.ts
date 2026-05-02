import { Module } from '@nestjs/common';
import { EventsModule } from '../../infrastructure/events/events.module';
import { CourierModule } from '../courier/courier.module';
import { OrdersController } from './orders.controller';
import { OrdersRepository } from './orders.repository';
import { OrdersService } from './orders.service';

@Module({
  imports: [EventsModule, CourierModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersRepository],
  exports: [OrdersService, OrdersRepository],
})
export class OrdersModule {}
