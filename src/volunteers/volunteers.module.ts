import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Volunteer } from '../entities/volunteer.entity';
import { VolunteersService } from './volunteers.service';
import { VolunteersController } from './volunteers.controller';
import { PCSModule } from '../integrations/pcs/pcs.module';
import { VolunteerHistorySeason } from 'src/entities/volunteer-history-season.entity';
import { VolunteerMinistrySeason } from 'src/entities/volunteer-ministry-season.entity';
import { Season } from 'src/entities/season.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Volunteer, VolunteerHistorySeason, VolunteerMinistrySeason, Season]),
    PCSModule,
  ],
  controllers: [VolunteersController],
  providers: [VolunteersService],
  exports: [VolunteersService],
})
export class VolunteersModule {}