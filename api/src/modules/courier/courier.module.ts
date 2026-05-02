import { Module } from '@nestjs/common';
import { EventsModule } from '../../infrastructure/events/events.module';
import { CourierAssignmentService } from './courier-assignment.service';
import { CourierController } from './courier.controller';
import { CourierRepository } from './courier.repository';
import { CourierService } from './courier.service';
import { CourierProfileGuard } from './guards/courier-profile.guard';

@Module({
  imports: [EventsModule],
  controllers: [CourierController],
  providers: [
    CourierService,
    CourierRepository,
    CourierProfileGuard,
    CourierAssignmentService,
  ],
  exports: [CourierService, CourierRepository, CourierAssignmentService],
})
export class CourierModule {}
