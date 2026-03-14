import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { KidEvent } from '../../entities/kid-event.entity';
import { MykidsModule } from '../../integrations/mykids/mykids.module';

@Module({
  imports: [TypeOrmModule.forFeature([KidEvent]), MykidsModule],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}