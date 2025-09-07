import { Controller, Post, Param, Body, UseGuards } from '@nestjs/common';
import { SeasonsService } from './seasons.service';
import { InscreverSeSeasonDto } from './dto/inscrever-se-season.dto';
import { ApplicationAuthGuard } from 'src/auth/application-auth.guard';
import { AllowApiKey } from 'src/auth/api-key-auth.decorator';

@Controller('seasons')
@UseGuards(ApplicationAuthGuard)
@AllowApiKey()
export class SeasonsController {
  constructor(private readonly seasonsService: SeasonsService) {}

  @Post(':id/inscreverse')
  async inscreverSe(
    @Param('id') id: string,
    @Body() inscreverSeDto: InscreverSeSeasonDto,
  ) {
    return this.seasonsService.inscreverSe(id, inscreverSeDto);
  }
}