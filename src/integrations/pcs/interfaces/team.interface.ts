export interface PCSTeamPeopleResponse {
  data: {
    id: string;
    attributes: {
      full_name: string;
      photo_url: string;
    };
    tags?: {
      data: {
        type: string;
        id: string;
      }[];
    };
  }[];
  meta: {
    total_count: number;
    count: number;
    prev?: {
      offset: number;
    };
    next?: {
      offset: number;
    };
  };
}