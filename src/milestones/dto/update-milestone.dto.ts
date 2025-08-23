import { PartialType } from '@nestjs/mapped-types';
import { CreateMilestoneDto } from './create-milestone.dto';
import { UpdateMilestoneStepDto } from './update-milestone-step.dto';

export class UpdateMilestoneDto extends PartialType(CreateMilestoneDto) {
}