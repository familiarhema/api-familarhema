import { IsString, IsEmail, IsISO8601 } from 'class-validator';

export class ValidateVolunteerDto {
  @IsString()
  nome: string;

  @IsEmail()
  email: string;

  @IsString()
  telefone: string;

  @IsISO8601()
  dataNascimento: string;
}

export interface ValidateVolunteerResponseDto {
  ministerios: {
    id: string;
    name: string;
  }[];
}