import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Volunteer } from '../entities/volunteer.entity';
import { VolunteersService } from './volunteers.service';
import { VolunteersController } from './volunteers.controller';
import { PCSModule } from '../integrations/pcs/pcs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Volunteer]),
    PCSModule,
  ],
  controllers: [VolunteersController],
  providers: [VolunteersService],
  exports: [VolunteersService],
})
export class VolunteersModule {}