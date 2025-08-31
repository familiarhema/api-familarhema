import { IsString, IsNumber, IsOptional, IsUUID, IsDate } from 'class-validator';

export class CreateCellDto {
  @IsString()
  name: string;

  @IsUUID()
  leaderId: string;

  @IsNumber()
  dayOfWeek: number;

  @IsOptional()
  @IsString()
  time?: string;

  @IsOptional()
  @IsString()
  location?: string;
}

export class CellBasicResponseDto {
  id: string;
  name: string;
}

export class CellDetailedResponseDto {
  id: string;
  name: string;
  leader: {
    id: string;
    name: string;
  };
  dayOfWeek: number;
  time?: string;
  location?: string;
}