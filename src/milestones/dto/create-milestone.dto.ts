import { CreateMilestoneStepDto } from './create-milestone-step.dto';

export class CreateMilestoneDto {
  name: string;
  icon?: string;
  life_cycle_id: string;
  steps?: CreateMilestoneStepDto[];
}