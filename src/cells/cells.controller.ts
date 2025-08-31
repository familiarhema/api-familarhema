import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApplicationAuthGuard } from '../auth/application-auth.guard';
import { CellsService } from './cells.service';
import { CreateCellDto, CellBasicResponseDto, CellDetailedResponseDto } from './dto/create-cell.dto';

@Controller('cells')
@UseGuards(JwtAuthGuard, ApplicationAuthGuard)
export class CellsController {
  constructor(private readonly cellsService: CellsService) {}

  @Post()
  async create(@Body() createCellDto: CreateCellDto): Promise<CellDetailedResponseDto> {
    return this.cellsService.create(createCellDto);
  }

  @Get()
  async getAll(): Promise<CellBasicResponseDto[]> {
    return this.cellsService.getAll();
  }

  @Get(':id')
  async getCellPorId(@Param('id') id: string): Promise<CellDetailedResponseDto> {
    return this.cellsService.getCellPorId(id);
  }
}