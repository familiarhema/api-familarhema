import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ResponsiblesService } from './responsibles.service';
import { CreateResponsiblesDto, ResponsiblesBasicResponseDto, ResponsiblesDetailedResponseDto } from './dto/create-responsibles.dto';

@Controller('kids/responsibles')
export class ResponsiblesController {
  constructor(private readonly responsiblesService: ResponsiblesService) {}

  @Post()
  async create(@Body() createResponsiblesDto: CreateResponsiblesDto): Promise<ResponsiblesDetailedResponseDto> {
    return this.responsiblesService.create(createResponsiblesDto);
  }

  @Get()
  async getAll(): Promise<ResponsiblesBasicResponseDto[]> {
    return this.responsiblesService.getAll();
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<ResponsiblesDetailedResponseDto> {
    return this.responsiblesService.getById(id);
  }
}