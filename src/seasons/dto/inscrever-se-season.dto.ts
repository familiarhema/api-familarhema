import { IsNotEmpty, IsEmail, IsString, IsArray, IsNumber, ValidateNested, IsDate, IsOptional, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

class CelulaDto {
  @IsNotEmpty({ message: 'O código da célula é obrigatório' })
  @IsUUID('all', { message: 'O código da célula deve ser um UUID válido' })
  codigo: string;

  @IsOptional()
  @IsString({ message: 'O nome da célula deve ser uma string' })
  nome?: string;
}

export class InscreverSeSeasonDto {
  @IsNotEmpty({ message: 'O código do voluntário é obrigatório' })
  @IsUUID('all', { message: 'O código do voluntário deve ser um UUID válido' })
  codigo: string;

  @IsNotEmpty({ message: 'O email é obrigatório' })
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @IsNotEmpty({ message: 'O celular é obrigatório' })
  @IsString({ message: 'O celular deve ser uma string' })
  celular: string;

  @IsOptional()
  @IsString({ message: 'O nome do voluntário deve ser uma string' })
  nomeVoluntario?: string;

  @IsOptional()
  @IsDate({ message: 'A data de nascimento deve ser uma data válida' })
  @Type(() => Date)
  dataNascimento?: Date;

  @IsNotEmpty({ message: 'É necessário informar ao menos um ministério' })
  @IsArray({ message: 'Ministérios deve ser um array' })
  @IsNumber({}, { each: true, message: 'Cada código de ministério deve ser um número' })
  ministerios: number[];

  @IsNotEmpty({ message: 'A célula é obrigatória' })
  @ValidateNested()
  @Type(() => CelulaDto)
  celula: CelulaDto;
}