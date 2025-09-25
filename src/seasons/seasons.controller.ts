import { Controller, Post, Get, Param, Body, UseGuards, Query, Put } from '@nestjs/common';
import { SeasonsService } from './seasons.service';
import { InscreverSeSeasonDto } from './dto/inscrever-se-season.dto';
import { SeasonFilterDto } from './dto/season-filter.dto';
import { UpdateVolunteerSeasonDto } from './dto/update-volunteer-season.dto';
import { ApplicationAuthGuard } from 'src/auth/application-auth.guard';
import { AllowApiKey } from 'src/auth/api-key-auth.decorator';

@Controller('seasons')
@UseGuards(ApplicationAuthGuard)
export class SeasonsController {
  constructor(private readonly seasonsService: SeasonsService) {}

  @Get()
  async findAll(@Query() filters: SeasonFilterDto) {
    return this.seasonsService.findAll(filters);
  }

  @Post(':id/inscreverse')
  @AllowApiKey()
  async inscreverSe(
    @Param('id') id: string,
    @Body() inscreverSeDto: InscreverSeSeasonDto,
  ) {
    return this.seasonsService.inscreverSe(id, inscreverSeDto);
  }

  @Get(':id/volunteers-by-ministry')
  async getVolunteersByMinistry(@Param('id') id: string) {
    return this.seasonsService.getVolunteersByMinistry(id);
  }

  @Get(':id/volunteers-by-cell')
  async getVolunteersByCell(@Param('id') id: string) {
    return this.seasonsService.getVolunteersByCell(id);
  }

  @Get(':id/volunteers-new-vs-old')
  async getVolunteersNewVsOld(@Param('id') id: string) {
    return this.seasonsService.getVolunteersNewVsOld(id);
  }

  @Get(':id/volunteers-by-age-group')
  async getVolunteersByAgeGroup(@Param('id') id: string) {
    return this.seasonsService.getVolunteersByAgeGroup(id);
  }

  @Put(':id/volunteer/:volunteerId')
  @AllowApiKey()
  async updateVolunteerSeason(
    @Param('id') seasonId: string,
    @Param('volunteerId') volunteerId: string,
    @Body() updateDto: UpdateVolunteerSeasonDto,
  ) {
    return this.seasonsService.updateVolunteerSeason(seasonId, volunteerId, updateDto);
  }
}