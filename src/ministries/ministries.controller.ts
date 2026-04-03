import { Controller, Get, UseGuards, Param, Post } from '@nestjs/common';
import { AllowApiKey } from '../auth/api-key-auth.decorator';
import { MinistriesService } from './ministries.service';
import { MinistryResponseDto } from './dto/ministry-response.dto';
import { ApplicationAuthGuard } from 'src/auth/application-auth.guard';

@Controller('ministries')
@UseGuards(ApplicationAuthGuard)
export class MinistriesController {
  constructor(private readonly ministriesService: MinistriesService) {}

  /** Lista todos os ministérios ativos. Aceita autenticação via API Key. */
  @Get('active')
  @AllowApiKey()
  async getActive(): Promise<MinistryResponseDto[]> {
    return this.ministriesService.getActive();
  }

  /** Processa os voluntários integrados no ministério que ainda não foram registrados na plataforma PCS.
   * Consulta a API externa PCS para identificar e registrar os membros ausentes. */
  @Post(':idMinistry/season/:idSeason/not-registered')
  async processNotRegisteredVolunteers(
    @Param('idMinistry') idMinistry: string,
    @Param('idSeason') idSeason: string,
  ): Promise<{ message: string }> {
    const ministryId = parseInt(idMinistry, 10);
    return this.ministriesService.processNotRegisteredVolunteers(ministryId, idSeason);
  }

  /** Sincroniza os voluntários aprovados de um ministério em uma temporada com o Planning Center.
   * Integra novos aprovados, marca os já presentes como Integrated e remove os não aprovados do time PCS. */
  @Post(':idMinistry/season/:idSeason/sync')
  async syncVolunteersWithPCS(
    @Param('idMinistry') idMinistry: string,
    @Param('idSeason') idSeason: string,
  ) {
    return this.ministriesService.syncVolunteersWithPCS(parseInt(idMinistry, 10), idSeason);
  }
}