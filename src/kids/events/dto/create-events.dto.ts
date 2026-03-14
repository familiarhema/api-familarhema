import { IsString, IsDateString, IsOptional } from 'class-validator';

export class CreateEventsDto {
  @IsString()
  name: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class EventsBasicResponseDto {
  id: number;
  name: string;
  date: string;
}

export class EventsDetailedResponseDto {
  id: number;
  name: string;
  date: string;
  description?: string;
}