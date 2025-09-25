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
import { PersonsService } from './persons.service';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { ApplicationAuthGuard } from 'src/auth/application-auth.guard';

@Controller('persons')
@UseGuards(ApplicationAuthGuard)
export class PersonsController {
  constructor(private readonly personsService: PersonsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@GetUser() user: any, @Body() createPersonDto: CreatePersonDto) {
    console.log('Authenticated user:', user);
    return this.personsService.create(createPersonDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  findAll(@GetUser() user: any) {
    console.log('Authenticated user:', user);
    return this.personsService.findAll();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  findOne(@GetUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    console.log('Authenticated user:', user);
    return this.personsService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  update(
    @GetUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePersonDto: UpdatePersonDto,
  ) {
    console.log('Authenticated user:', user);
    return this.personsService.update(id, updatePersonDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@GetUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    console.log('Authenticated user:', user);
    return this.personsService.remove(id);
  }
}