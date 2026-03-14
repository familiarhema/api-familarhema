import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ChildrensService } from './childrens.service';
import { CreateChildrensDto, ChildrensBasicResponseDto, ChildrensDetailedResponseDto } from './dto/create-childrens.dto';

@Controller('kids/childrens')
export class ChildrensController {
  constructor(private readonly childrensService: ChildrensService) {}

  @Post()
  async create(@Body() createChildrensDto: CreateChildrensDto): Promise<ChildrensDetailedResponseDto> {
    return this.childrensService.create(createChildrensDto);
  }

  @Get()
  async getAll(): Promise<ChildrensBasicResponseDto[]> {
    return this.childrensService.getAll();
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<ChildrensDetailedResponseDto> {
    return this.childrensService.getById(id);
  }
}