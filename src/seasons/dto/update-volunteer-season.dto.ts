import { IsArray, IsNumber, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class MinistryUpdateDto {
  @IsNumber()
  ministry_id: number;

  @IsString()
  status: 'Created' | 'Accepted' | 'Rejected' | 'Integrated';
}

export class UpdateVolunteerSeasonDto {
  @IsNumber()
  startServicedAt: number;

  @IsUUID()
  cell_id: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MinistryUpdateDto)
  ministries: MinistryUpdateDto[];
}