import { Controller, Get } from '@nestjs/common';
import { AllowApiKey } from '../auth/api-key-auth.decorator';
import { MinistriesService } from './ministries.service';
import { MinistryResponseDto } from './dto/ministry-response.dto';

@Controller('ministries')
export class MinistriesController {
  constructor(private readonly ministriesService: MinistriesService) {}

  @Get('active')
  @AllowApiKey()
  async getActive(): Promise<MinistryResponseDto[]> {
    return this.ministriesService.getActive();
  }
}