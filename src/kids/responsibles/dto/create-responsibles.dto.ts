import { IsString, IsOptional } from 'class-validator';

export class CreateResponsiblesDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  contact?: string;

  @IsOptional()
  @IsString()
  relation?: string;
}

export class ResponsiblesBasicResponseDto {
  id: string;
  name: string;
}

export class ResponsiblesDetailedResponseDto {
  id: string;
  name: string;
  contact?: string;
  relation?: string;
}