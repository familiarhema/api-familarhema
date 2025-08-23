import { PartialType } from '@nestjs/mapped-types';
import { CreateMilestoneStepDto } from './create-milestone-step.dto';

export class UpdateMilestoneStepDto extends PartialType(CreateMilestoneStepDto) {
  id?: string;
}