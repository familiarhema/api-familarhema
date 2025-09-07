import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeasonsController } from './seasons.controller';
import { SeasonsService } from './seasons.service';
import { Season } from '../entities/season.entity';
import { Volunteer } from '../entities/volunteer.entity';
import { Cell } from '../entities/cell.entity';
import { Ministry } from '../entities/ministry.entity';
import { VolunteerHistorySeason } from '../entities/volunteer-history-season.entity';
import { VolunteerMinistrySeason } from '../entities/volunteer-ministry-season.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Season,
      Volunteer,
      Cell,
      Ministry,
      VolunteerHistorySeason,
      VolunteerMinistrySeason
    ]),
  ],
  controllers: [SeasonsController],
  providers: [SeasonsService],
  exports: [SeasonsService],
})
export class SeasonsModule {}