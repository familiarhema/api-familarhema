import { PartialType } from '@nestjs/mapped-types';
import { CreatePersonDto } from './create-person.dto';
import { UpdatePersonContactDto } from './update-person-contact.dto';

export class UpdatePersonDto extends PartialType(CreatePersonDto) {
}