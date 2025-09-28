import { IsArray, IsNumber } from 'class-validator';

export class ApproveMinistriesDto {
  @IsArray()
  @IsNumber({}, { each: true })
  ministryIds: number[];
}