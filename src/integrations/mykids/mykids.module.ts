import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MykidsIntegrationService } from './mykids-integration.service';
import { MykidsController } from './mykids.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
      HttpModule,
      ConfigModule,
    ],
  controllers: [MykidsController],
  providers: [MykidsIntegrationService],
  exports: [MykidsIntegrationService],
})
export class MykidsModule {}