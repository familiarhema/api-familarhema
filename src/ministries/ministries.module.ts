import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Ministry } from '../entities/ministry.entity';
import { MinistriesController } from './ministries.controller';
import { MinistriesService } from './ministries.service';
import { AuthGuardsModule } from '../auth/auth-guards.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ministry]),
    ConfigModule,
    AuthGuardsModule,
  ],
  controllers: [MinistriesController],
  providers: [MinistriesService],
  exports: [MinistriesService],
})
export class MinistriesModule {}
