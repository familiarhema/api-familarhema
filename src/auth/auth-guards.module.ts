import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ApiKeyAuthGuard } from './api-key-auth.guard';
import { ApplicationAuthGuard } from './application-auth.guard';

@Global()
@Module({
  imports: [
    ConfigModule,
    JwtModule.register({}),
  ],
  providers: [
    ApiKeyAuthGuard,
    ApplicationAuthGuard,
    JwtAuthGuard,
  ],
  exports: [
    ApiKeyAuthGuard,
    ApplicationAuthGuard,
    JwtAuthGuard,
  ],
})
export class AuthGuardsModule {}
