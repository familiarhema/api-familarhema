import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApplicationAuthGuard } from '../auth/application-auth.guard';
import { VolunteersService } from './volunteers.service';
import { ValidateVolunteerDto, ValidateVolunteerResponseDto } from './dto/validate-volunteer.dto';

@Controller('volunteers')
@UseGuards(JwtAuthGuard, ApplicationAuthGuard)
export class VolunteersController {
  constructor(private readonly volunteersService: VolunteersService) {}

  @Post('validate')
  async validateVolunteer(
    @Body() data: ValidateVolunteerDto,
  ): Promise<ValidateVolunteerResponseDto> {
    return this.volunteersService.validateVolunteer(data);
  }
}