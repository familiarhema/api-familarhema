import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { AuthGuardsModule } from './auth/auth-guards.module';
import { APP_GUARD } from '@nestjs/core';
import { ApiKeyAuthGuard } from './auth/api-key-auth.guard';
import { ConfigModule } from '@nestjs/config';
import { LifeCyclesModule } from './life-cycles/life-cycles.module';
import { MilestonesModule } from './milestones/milestones.module';
import { PersonsModule } from './persons/persons.module';
import { VolunteersModule } from './volunteers/volunteers.module';
import { CellsModule } from './cells/cells.module';
import { MinistriesModule } from './ministries/ministries.module';
import * as process from 'process';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST,
      port: Number(process.env.POSTGRES_PORT),
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
      autoLoadEntities: true,
    }),
    AuthModule,
    AuthGuardsModule,
    LifeCyclesModule,
    MilestonesModule,
    PersonsModule,
    VolunteersModule,
    CellsModule,
    MinistriesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ApiKeyAuthGuard,
    },
  ],
})
export class AppModule {}
