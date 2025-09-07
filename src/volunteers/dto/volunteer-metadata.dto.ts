class CellDto {
  id: string;
  name: string;
}

class MinistryDto {
  id: number;
  name: string;
}

export class VolunteerMetadataDto {
  cells: CellDto[];
  ministries: MinistryDto[];
}