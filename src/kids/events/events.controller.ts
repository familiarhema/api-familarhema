import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventsDto, EventsBasicResponseDto, EventsDetailedResponseDto } from './dto/create-events.dto';

@Controller('kids/events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  async create(@Body() createEventsDto: CreateEventsDto): Promise<EventsDetailedResponseDto> {
    return this.eventsService.create(createEventsDto);
  }

  @Get()
  async getAll(): Promise<EventsBasicResponseDto[]> {
    return this.eventsService.getAll();
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<EventsDetailedResponseDto> {
    return this.eventsService.getById(parseInt(id, 10));
  }

  @Get(':eventCode/RegisteredsAgeSex')
  async getRegisteredByAgeAndSex(@Param('eventCode') eventCode: string): Promise<any> {
    return this.eventsService.getRegisteredByAgeAndSex(eventCode);
  }

  @Get(':eventCode/registereds')
  async getRegistereds(@Param('eventCode') eventCode: string): Promise<any> {
    return this.eventsService.getRegistereds(eventCode);
  }
}