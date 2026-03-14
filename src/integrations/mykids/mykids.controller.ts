import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApplicationAuthGuard } from '../../auth/application-auth.guard';
import { MykidsIntegrationService } from './mykids-integration.service';

@Controller('mykids')
@UseGuards(ApplicationAuthGuard)
export class MykidsController {
  constructor(private readonly mykidsService: MykidsIntegrationService) {}

  @Get('buscar-inscritos-eventos')
  async buscarInscritosEventos(@Query('codigoEvento') codigoEvento: string): Promise<any> {
    return this.mykidsService.buscarInscritosEventos(codigoEvento);
  }
}