import { Controller, Post, Get, Body, UseGuards, Param, Query, Delete } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApplicationAuthGuard } from '../auth/application-auth.guard';
import { VolunteersService } from './volunteers.service';
import { ValidateVolunteerDto, ValidateVolunteerResponseDto } from './dto/validate-volunteer.dto';
import { VolunteerFilterDto } from './dto/volunteer-filter.dto';
import { VolunteerListResponseDto } from './dto/volunteer-list-response.dto';
import { AllowApiKey } from 'src/auth/api-key-auth.decorator';

@Controller('volunteers')
@UseGuards(ApplicationAuthGuard)
export class VolunteersController {
  constructor(private readonly volunteersService: VolunteersService) {}

  @Post('validate')
  @AllowApiKey()
  async validateVolunteer(
    @Body() data: ValidateVolunteerDto,
  ): Promise<ValidateVolunteerResponseDto> {
    return this.volunteersService.validateVolunteer(data);
  }

  @Get('season/:seasonId')
  async listVolunteers(
    @Param('seasonId') seasonId: string,
    @Query() filters: VolunteerFilterDto
  ): Promise<VolunteerListResponseDto> {
    return this.volunteersService.listVolunteers(seasonId, filters);
  }

  @Delete(':id/season/:seasonId')
  async cancelInscription(
    @Param('id') volunteerId: string,
    @Param('seasonId') seasonId: string,
  ): Promise<{ message: string }> {
    return this.volunteersService.cancelInscription(volunteerId, seasonId);
  }
}