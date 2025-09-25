interface PCSPhoneNumber {
  type: string;
  id: string;
  attributes: {
    address: string;
    country_code: string;
    e164: string;
    location: string;
    national: string;
    number: string;
    primary: boolean;
    updated_at: string;
  };
}

interface PCSPersonAttributes {
  avatar: string;
  birthdate: string;
  created_at: string;
  first_name: string;
  gender: string | null;
  last_name: string;
  login_identifier: string;
  name: string;
  updated_at: string;
}

interface PCSPerson {
  id: string;
  attributes: PCSPersonAttributes;
}

export interface PCSPersonResponse {
  data: PCSPerson[];
  included?: PCSPhoneNumber[];
}

export interface PCSPersonDTO {
  id: string;
  name: string;
  email: string;
  avatar: string;
  birthdate: string;
  created_at: string;
  phone_number?: string;
}