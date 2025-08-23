import { CreatePersonContactDto } from './create-person-contact.dto';

export class CreatePersonDto {
  full_name: string;
  email?: string;
  phone?: string;
  birth_date?: Date;
  gender?: string;
  is_member?: boolean;
  contacts?: CreatePersonContactDto[];
}