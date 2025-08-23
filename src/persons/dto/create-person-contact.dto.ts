export enum ContactType {
  TELEFONE = 'telefone',
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
  OUTRO = 'outro'
}

export class CreatePersonContactDto {
  type: ContactType;
  value: string;
  is_primary?: boolean;
}