import { IsArray } from 'class-validator';
import { IsUUID } from 'class-validator';

export class BatchApproveDto {
  @IsArray()
  @IsUUID('all', { each: true })
  volunteerIds: string[];
}