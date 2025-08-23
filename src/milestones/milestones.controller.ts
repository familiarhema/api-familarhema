import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe
} from '@nestjs/common';
import { MilestonesService } from './milestones.service';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';

@Controller('milestones')
@UseGuards(JwtAuthGuard)
export class MilestonesController {
  constructor(private readonly milestonesService: MilestonesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@GetUser() user: any, @Body() createMilestoneDto: CreateMilestoneDto) {
    console.log('Authenticated user:', user);
    return this.milestonesService.create(createMilestoneDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  findAll(@GetUser() user: any) {
    console.log('Authenticated user:', user);
    return this.milestonesService.findAll();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  findOne(@GetUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    console.log('Authenticated user:', user);
    return this.milestonesService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  update(
    @GetUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateMilestoneDto: UpdateMilestoneDto,
  ) {
    console.log('Authenticated user:', user);
    return this.milestonesService.update(id, updateMilestoneDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@GetUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    console.log('Authenticated user:', user);
    return this.milestonesService.remove(id);
  }
}