import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cell } from '../entities/cell.entity';
import { CellsService } from './cells.service';
import { CellsController } from './cells.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Cell])],
  controllers: [CellsController],
  providers: [CellsService],
  exports: [CellsService],
})
export class CellsModule {}