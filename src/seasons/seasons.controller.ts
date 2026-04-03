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

  /** Lista todas as temporadas com suporte a filtros via query params. */
  @Get()
  async findAll(@Query() filters: SeasonFilterDto) {
    return this.seasonsService.findAll(filters);
  }

  /** Inscreve um voluntário em uma temporada com os ministérios escolhidos.
   * Aceita autenticação via API Key; valida disponibilidade da temporada. */
  @Post(':id/inscreverse')
  @AllowApiKey()
  async inscreverSe(
    @Param('id') id: string,
    @Body() inscreverSeDto: InscreverSeSeasonDto,
  ) {
    return this.seasonsService.inscreverSe(id, inscreverSeDto);
  }

  /** Retorna os voluntários de uma temporada agrupados por ministério. */
  @Get(':id/volunteers-by-ministry')
  async getVolunteersByMinistry(@Param('id') id: string) {
    return this.seasonsService.getVolunteersByMinistry(id);
  }

  /** Retorna os voluntários de uma temporada agrupados por célula. */
  @Get(':id/volunteers-by-cell')
  async getVolunteersByCell(@Param('id') id: string) {
    return this.seasonsService.getVolunteersByCell(id);
  }

  /** Retorna a comparação entre voluntários novos e recorrentes em uma temporada. */
  @Get(':id/volunteers-new-vs-old')
  async getVolunteersNewVsOld(@Param('id') id: string) {
    return this.seasonsService.getVolunteersNewVsOld(id);
  }

  /** Retorna os voluntários de uma temporada agrupados por faixa etária. */
  @Get(':id/volunteers-by-age-group')
  async getVolunteersByAgeGroup(@Param('id') id: string) {
    return this.seasonsService.getVolunteersByAgeGroup(id);
  }

  /** Atualiza os dados de um voluntário em uma temporada específica. Aceita autenticação via API Key. */
  @Put(':id/volunteer/:volunteerId')
  @AllowApiKey()
  async updateVolunteerSeason(
    @Param('id') seasonId: string,
    @Param('volunteerId') volunteerId: string,
    @Body() updateDto: UpdateVolunteerSeasonDto,
  ) {
    return this.seasonsService.updateVolunteerSeason(seasonId, volunteerId, updateDto);
  }

  /** Integra no sistema interno todos os voluntários aprovados de um ministério em uma temporada. */
  @Post(':seasonId/ministry/:ministryId/integrate-volunteers')
  async integrateVolunteersByMinistry(
    @Param('seasonId') seasonId: string,
    @Param('ministryId') ministryId: string,
  ) {
    return this.seasonsService.integrateVolunteersByMinistry(seasonId, ministryId);
  }
}