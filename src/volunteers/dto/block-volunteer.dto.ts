import { IsString, IsNotEmpty } from 'class-validator';

export class BlockVolunteerDto {
  @IsNotEmpty()
  @IsString()
  reason: string;
}