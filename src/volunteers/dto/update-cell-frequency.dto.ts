import { IsNumber, Min, Max } from 'class-validator';

export class UpdateCellFrequencyDto {
  @IsNumber()
  @Min(1)
  @Max(10)
  frequency: number;
}