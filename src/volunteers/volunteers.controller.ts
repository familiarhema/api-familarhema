import { Controller, Post, Get, Body, UseGuards, Param, Query, Delete, Put } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApplicationAuthGuard } from '../auth/application-auth.guard';
import { VolunteersService } from './volunteers.service';
import { ValidateVolunteerDto, ValidateVolunteerResponseDto } from './dto/validate-volunteer.dto';
import { VolunteerFilterDto } from './dto/volunteer-filter.dto';
import { VolunteerListResponseDto } from './dto/volunteer-list-response.dto';
import { ApproveMinistriesDto } from './dto/approve-ministries.dto';
import { VolunteerStatusQueryDto } from './dto/volunteer-status-query.dto';
import { BatchApproveDto } from './dto/batch-approve.dto';
import { BlockVolunteerDto } from './dto/block-volunteer.dto';
import { NoCellVolunteerDto } from './dto/no-cell-volunteer.dto';
import { NoMinistryVolunteerDto } from './dto/no-ministry-volunteer.dto';
import { UpdateCellFrequencyDto } from './dto/update-cell-frequency.dto';
import { UpdateAttendedVolunteersDayDto } from './dto/update-attended-volunteers-day.dto';
import { AllowApiKey } from 'src/auth/api-key-auth.decorator';
import { CellVolunteersDto } from './dto/cell-volunteers.dto';
import { SeasonVolunteersDto } from './dto/season-volunteers.dto';
import { VolunteerInscriptionStatusDto } from './dto/volunteer-inscription-status.dto';

@Controller('volunteers')
@UseGuards(ApplicationAuthGuard)
export class VolunteersController {
  constructor(private readonly volunteersService: VolunteersService) {}

  /** Valida e registra a inscrição de um voluntário na temporada ativa.
   * Consulta a API externa PCS para buscar ou criar o voluntário; aceita autenticação via API Key. */
  @Post('validate')
  @AllowApiKey()
  async validateVolunteer(
    @Body() data: ValidateVolunteerDto,
  ): Promise<ValidateVolunteerResponseDto> {
    return this.volunteersService.validateVolunteer(data);
  }

  /** Lista os voluntários inscritos em uma temporada com suporte a filtros via query params. */
  @Get('season/:seasonId')
  async listVolunteers(
    @Param('seasonId') seasonId: string,
    @Query() filters: VolunteerFilterDto
  ): Promise<VolunteerListResponseDto> {
    return this.volunteersService.listVolunteers(seasonId, filters);
  }

  /** Cancela a inscrição de um voluntário em uma temporada específica. */
  @Delete(':id/season/:seasonId')
  async cancelInscription(
    @Param('id') volunteerId: string,
    @Param('seasonId') seasonId: string,
  ): Promise<{ message: string }> {
    return this.volunteersService.cancelInscription(volunteerId, seasonId);
  }

  /** Aprova uma lista de ministérios para um voluntário em uma temporada. */
  @Put(':id/season/:seasonId/ministries')
  async approveMinistries(
    @Param('id') volunteerId: string,
    @Param('seasonId') seasonId: string,
    @Body() approveDto: ApproveMinistriesDto,
  ): Promise<{ message: string }> {
    return this.volunteersService.approveMinistries(volunteerId, seasonId, approveDto.ministryIds);
  }

  /** Retorna os ministérios com links de grupo de um voluntário identificado por e-mail ou telefone.
   * Aceita autenticação via API Key; consulta dados da temporada ativa. */
  @Get('status')
  @AllowApiKey()
  async getVolunteerStatus(
    @Query() query: VolunteerStatusQueryDto,
  ): Promise<{ ministerios: { name: string; linkShadowGroup: string }[] }> {
    return this.volunteersService.getVolunteerStatus(query);
  }

  /** Retorna o status detalhado de inscrição do voluntário, incluindo célula e ministérios por temporada.
   * Aceita autenticação via API Key. */
  @Get('status-subscribe')
  @AllowApiKey()
  async getVolunteerInscriptionStatus(
    @Query() query: VolunteerStatusQueryDto,
  ): Promise<VolunteerInscriptionStatusDto> {
    return this.volunteersService.getVolunteerInscriptionStatus(query);
  }

  /** Aprova em lote uma lista de voluntários para um ministério em uma temporada. */
  @Put('season/:idSeason/ministry/:idMinistry/approve')
  async batchApproveMinistries(
    @Param('idSeason') seasonId: string,
    @Param('idMinistry') ministryId: string,
    @Body() dto: BatchApproveDto,
  ): Promise<{ message: string }> {
    return this.volunteersService.batchApproveMinistries(seasonId, ministryId, dto.volunteerIds);
  }

  /** Bloqueia a participação de um voluntário em uma temporada, registrando o motivo informado. */
  @Put(':idVolunteer/season/:idSeason/block')
  async blockVolunteer(
    @Param('idVolunteer') volunteerId: string,
    @Param('idSeason') seasonId: string,
    @Body() dto: BlockVolunteerDto,
  ): Promise<{ message: string }> {
    return this.volunteersService.blockVolunteer(volunteerId, seasonId, dto.reason);
  }

  /** Aprova individualmente a inscrição de um voluntário em um ministério de uma temporada. */
  @Put(':idVolunteer/season/:idSeason/ministry/:idMinistry/approve')
  async approveMinistry(
    @Param('idVolunteer') volunteerId: string,
    @Param('idSeason') seasonId: string,
    @Param('idMinistry') ministryId: string,
  ): Promise<{ message: string }> {
    return this.volunteersService.approveMinistry(volunteerId, seasonId, parseInt(ministryId));
  }

  /** Reprova a inscrição de um voluntário em um ministério específico de uma temporada. */
  @Put(':idVolunteer/season/:idSeason/ministry/:idMinistry/disapprove')
  async disapproveMinistry(
    @Param('idVolunteer') volunteerId: string,
    @Param('idSeason') seasonId: string,
    @Param('idMinistry') ministryId: string,
  ): Promise<{ message: string }> {
    return this.volunteersService.disapproveMinistry(volunteerId, seasonId, parseInt(ministryId));
  }

  /** Lista os voluntários de uma temporada que ainda não possuem célula associada. */
  @Get('season/:seasonId/no-cell')
  async getVolunteersWithoutCell(@Param('seasonId') seasonId: string): Promise<NoCellVolunteerDto[]> {
    return this.volunteersService.getVolunteersWithoutCell(seasonId);
  }

  /** Lista os voluntários de uma temporada que ainda não possuem ministério associado. */
  @Get('season/:seasonId/no-ministry')
  async getVolunteersWithoutMinistry(@Param('seasonId') seasonId: string): Promise<NoMinistryVolunteerDto[]> {
    return this.volunteersService.getVolunteersWithoutMinistry(seasonId);
  }

  /** Atualiza a frequência de célula de um voluntário. Aceita autenticação via API Key. */
  @Put(':idVolunteer/cell-frequency')
  @AllowApiKey()
  async updateCellFrequency(
    @Param('idVolunteer') volunteerId: string,
    @Body() dto: UpdateCellFrequencyDto,
  ): Promise<{ message: string }> {
    return this.volunteersService.updateCellFrequency(volunteerId, dto.frequency);
  }

  /** Registra a presença ou ausência de um voluntário no dia de encontro da temporada. */
  @Put(':idVolunteer/season/:idSeason/attended-volunteers-day')
  async updateAttendedVolunteersDay(
    @Param('idVolunteer') volunteerId: string,
    @Param('idSeason') seasonId: string,
    @Body() dto: UpdateAttendedVolunteersDayDto,
  ): Promise<{ message: string }> {
    return this.volunteersService.updateAttendedVolunteersDay(volunteerId, seasonId, dto.attended);
  }

  /** Integra um voluntário como pessoa no sistema interno, vinculando-o à temporada informada. */
  @Post(':idVolunteer/season/:idSeason/integrate/person')
  async integratePerson(
    @Param('idVolunteer') volunteerId: string,
    @Param('idSeason') seasonId: string,
  ): Promise<{ message: string; personId?: string }> {
    return this.volunteersService.integratePerson(volunteerId, seasonId);
  }

  /** Integra em lote todos os voluntários de uma temporada como pessoas no sistema interno. */
  @Post('season/:idSeason/integrate/person')
  async integrateAllPersons(@Param('idSeason') seasonId: string): Promise<{ message: string }> {
    return this.volunteersService.integrateAllPersons(seasonId);
  }

  /** Integra os ministérios de um voluntário em uma temporada junto ao sistema interno. */
  @Post(':idVolunteer/season/:idSeason/integrate/ministries')
  async integrateMinistries(
    @Param('idVolunteer') volunteerId: string,
    @Param('idSeason') seasonId: string,
  ): Promise<{ message: string }> {
    return this.volunteersService.integrateMinistries(volunteerId, seasonId);
  }

  /** Retorna os voluntários vinculados a uma célula específica. Aceita autenticação via API Key. */
  @Get('cell/:cellId')
  @AllowApiKey()
  async getVolunteersByCell(@Param('cellId') cellId: string): Promise<CellVolunteersDto[]> {
    return this.volunteersService.getVolunteersByCell(cellId);
  }

  /** Retorna a lista completa de voluntários vinculados a uma temporada. */
  @Get('season/:seasonId/list')
  async getVolunteersBySeason(@Param('seasonId') seasonId: string): Promise<SeasonVolunteersDto[]> {
    return this.volunteersService.getVolunteersBySeason(seasonId);
  }
}