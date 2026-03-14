import { IsBoolean } from 'class-validator';

export class UpdateAttendedVolunteersDayDto {
  @IsBoolean()
  attended: boolean;
}