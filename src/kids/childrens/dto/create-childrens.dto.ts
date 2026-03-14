import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateChildrensDto {
  @IsString()
  name: string;

  @IsNumber()
  age: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class ChildrensBasicResponseDto {
  id: string;
  name: string;
  age: number;
}

export class ChildrensDetailedResponseDto {
  id: string;
  name: string;
  age: number;
  description?: string;
}