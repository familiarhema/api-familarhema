import { IsString, IsNotEmpty } from 'class-validator';

export class VolunteerStatusQueryDto {
  @IsNotEmpty()
  @IsString()
  email: string;

  @IsNotEmpty()
  @IsString()
  telefone: string;
}