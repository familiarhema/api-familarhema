import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApplicationAuthGuard } from '../auth/application-auth.guard';
import { CellsService } from './cells.service';
import { CreateCellDto, CellBasicResponseDto, CellDetailedResponseDto } from './dto/create-cell.dto';
import { AllowApiKey } from 'src/auth/api-key-auth.decorator';

@Controller('cells')
@UseGuards(ApplicationAuthGuard)
export class CellsController {
  constructor(private readonly cellsService: CellsService) {}

  /** Cria uma nova célula com os dados fornecidos no corpo da requisição. */
  @Post()
  async create(@Body() createCellDto: CreateCellDto): Promise<CellDetailedResponseDto> {
    return this.cellsService.create(createCellDto);
  }

  /** Retorna a listagem básica de todas as células cadastradas. */
  @Get()
  async getAll(): Promise<CellBasicResponseDto[]> {
    return this.cellsService.getAll();
  }

  /** Lista apenas as células ativas. Aceita autenticação via API Key. */
  @AllowApiKey()
  @Get('active')
  async getActive(): Promise<CellBasicResponseDto[]> {
    return this.cellsService.getActive();
  }

  /** Retorna os dados detalhados de uma célula pelo ID informado. */
  @Get(':id')
  async getCellPorId(@Param('id') id: string): Promise<CellDetailedResponseDto> {
    return this.cellsService.getCellPorId(id);
  }
}