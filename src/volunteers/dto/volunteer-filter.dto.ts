import { IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class VolunteerFilterDto {
  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  ministerioId?: number;

  @IsNumber()
  @Type(() => Number)
  page: number = 1;
}