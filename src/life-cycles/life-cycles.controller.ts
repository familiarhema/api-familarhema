import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UseGuards
} from '@nestjs/common';
import { LifeCyclesService } from './life-cycles.service';
import { CreateLifeCycleDto } from './dto/create-life-cycle.dto';
import { UpdateLifeCycleDto } from './dto/update-life-cycle.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';

@Controller('life-cycles')
@UseGuards(JwtAuthGuard)
export class LifeCyclesController {
  constructor(private readonly lifeCyclesService: LifeCyclesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@GetUser() user: any, @Body() createLifeCycleDto: CreateLifeCycleDto) {
    // console.log('Authenticated user:', user);
    return this.lifeCyclesService.create(createLifeCycleDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  findAll(@GetUser() user: any) {
    // console.log('Authenticated user:', user);
    return this.lifeCyclesService.findAll();
  }

  @Get('my-lifecycles')
  @HttpCode(HttpStatus.OK)
  findAllByUserRole(@GetUser() user: any) {
    // console.log('Authenticated user:', user);
    if (!user.role?.id) {
      return [];
    }
    return this.lifeCyclesService.findAllByUserRole(user.role.id);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  findOne(@GetUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    // console.log('Authenticated user:', user);
    return this.lifeCyclesService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  update(
    @GetUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateLifeCycleDto: UpdateLifeCycleDto,
  ) {
    // console.log('Authenticated user:', user);
    return this.lifeCyclesService.update(id, updateLifeCycleDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@GetUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    // console.log('Authenticated user:', user);
    return this.lifeCyclesService.remove(id);
  }
}