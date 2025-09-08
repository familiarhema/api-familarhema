import { Controller, Post, Get, Param, Body, UseGuards, Query } from '@nestjs/common';
import { SeasonsService } from './seasons.service';
import { InscreverSeSeasonDto } from './dto/inscrever-se-season.dto';
import { SeasonFilterDto } from './dto/season-filter.dto';
import { ApplicationAuthGuard } from 'src/auth/application-auth.guard';
import { AllowApiKey } from 'src/auth/api-key-auth.decorator';

@Controller('seasons')
@UseGuards(ApplicationAuthGuard)
@AllowApiKey()
export class SeasonsController {
  constructor(private readonly seasonsService: SeasonsService) {}

  @Get()
  async findAll(@Query() filters: SeasonFilterDto) {
    return this.seasonsService.findAll(filters);
  }

  @Post(':id/inscreverse')
  async inscreverSe(
    @Param('id') id: string,
    @Body() inscreverSeDto: InscreverSeSeasonDto,
  ) {
    return this.seasonsService.inscreverSe(id, inscreverSeDto);
  }
}