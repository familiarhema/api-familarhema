class MinisterioVoluntarioDto {
  new_id: string;
  status: string;
  id: number;
  name: string;
}

export class VolunteerListItemDto {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  registration_date: Date;
  new_phone: string;
  new_email: string;
  cell_name: string;
  new_cell: boolean;
  history_id: string;
  new_ministeries: MinisterioVoluntarioDto[];
}

export class VolunteerListResponseDto {
  items: VolunteerListItemDto[];
  total: number;
  page: number;
  totalPages: number;
}