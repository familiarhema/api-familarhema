export class InscriptionMinistryDto {
  name: string;
  principal: boolean;
}

export class InscriptionCellDto {
  id: string | null;
  name: string;
}

export class VolunteerInscriptionStatusDto {
  ministerios: InscriptionMinistryDto[];
  celula: InscriptionCellDto;
}
