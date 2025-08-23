import { PartialType } from '@nestjs/mapped-types';
import { CreatePersonContactDto } from './create-person-contact.dto';

export class UpdatePersonContactDto extends PartialType(CreatePersonContactDto) {
  id?: string;
}