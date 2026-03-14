import { Controller, Get, UseGuards, Param, Post } from '@nestjs/common';
import { AllowApiKey } from '../auth/api-key-auth.decorator';
import { MinistriesService } from './ministries.service';
import { MinistryResponseDto } from './dto/ministry-response.dto';
import { ApplicationAuthGuard } from 'src/auth/application-auth.guard';

@Controller('ministries')
@UseGuards(ApplicationAuthGuard)
export class MinistriesController {
  constructor(private readonly ministriesService: MinistriesService) {}

  @Get('active')
  @AllowApiKey()
  async getActive(): Promise<MinistryResponseDto[]> {
    return this.ministriesService.getActive();
  }

  @Post(':idMinistry/season/:idSeason/not-registered')
  async processNotRegisteredVolunteers(
    @Param('idMinistry') idMinistry: string,
    @Param('idSeason') idSeason: string,
  ): Promise<{ message: string }> {
    const ministryId = parseInt(idMinistry, 10);
    return this.ministriesService.processNotRegisteredVolunteers(ministryId, idSeason);
  }
}