import { PartialType } from '@nestjs/mapped-types';
import { CreateLifeCycleDto } from './create-life-cycle.dto';

export class UpdateLifeCycleDto extends PartialType(CreateLifeCycleDto) {}