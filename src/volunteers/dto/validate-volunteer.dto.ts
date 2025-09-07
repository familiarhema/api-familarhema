import { IsString, IsEmail, IsISO8601 } from 'class-validator';

export class ValidateVolunteerDto {
  @IsEmail()
  email: string;

  @IsString()
  telefone: string;

}

export interface ValidateVolunteerResponseDto {
  ministerios: {
    id: string;
    name: string;
  }[];
}