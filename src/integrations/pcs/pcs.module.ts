import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { PCSIntegrationService } from './pcs-integration.service';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
  ],
  providers: [PCSIntegrationService],
  exports: [PCSIntegrationService],
})
export class PCSModule {}