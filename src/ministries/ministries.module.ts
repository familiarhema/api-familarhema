import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Ministry } from '../entities/ministry.entity';
import { MinistriesController } from './ministries.controller';
import { MinistriesService } from './ministries.service';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { PCSModule } from '../integrations/pcs/pcs.module';
import { Volunteer } from '../entities/volunteer.entity';
import { VolunteerMinistrySeason } from '../entities/volunteer-ministry-season.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ministry, Volunteer, VolunteerMinistrySeason]),
    ConfigModule,
    AuthGuardsModule,
    PCSModule,
  ],
  controllers: [MinistriesController],
  providers: [MinistriesService],
  exports: [MinistriesService],
})
export class MinistriesModule {}
