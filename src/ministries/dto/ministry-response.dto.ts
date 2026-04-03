export class MinistryResponseDto {
  id: number;
  name: string;
  description: string;
  hearing: boolean;
  hideNewVolunteer: boolean;
  onlyIndicatin: boolean;
  block_new_registration: boolean;
  team_id: string | null;
}