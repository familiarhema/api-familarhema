import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { PCSPersonResponse, PCSPersonDTO, PCSFullPersonDTO, PCSServicesPersonDTO } from './interfaces/person.interface';
import { PCSTagResponse, TagsMinisteriosDTO } from './interfaces/tag.interface';
import { PCSTeamPeopleResponse } from './interfaces/team.interface';

@Injectable()
export class PCSIntegrationService {
  private readonly baseUrl = 'https://api.planningcenteronline.com';
  private readonly auth: string;
  private readonly MINISTERIO_GROUP_ID = '2189274';
  private readonly STATUS_GROUP_ID = '2466959';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    const username = this.configService.get<string>('PCS_USERNAME');
    const password = this.configService.get<string>('PCS_PASSWORD');

    if (!username || !password) {
      throw new Error('PCS_USERNAME e PCS_PASSWORD devem ser configurados no arquivo .env');
    }

    this.auth = Buffer.from(`${username}:${password}`).toString('base64');
  }

  async buscarPessoaTelefoneEmail(telefoneEmail: string): Promise<PCSPersonDTO | null> {
    try {
      const url = `${this.baseUrl}/people/v2/people`;
      const params = {
        'where[search_name_or_email]': telefoneEmail,
        'include': 'phone_numbers,emails'
      };

      const { data } = await firstValueFrom(
        this.httpService.get<PCSPersonResponse>(url, {
          params,
          headers: {
            Authorization: `Basic ${this.auth}`,
            Accept: 'application/json',
          },
        })
      );

      if (!data.data.length) {
        return null;
      }

      const person = data.data[0];
      const primaryPhone = data.included?.find(
        item => item.type === 'PhoneNumber' && item.attributes.primary
      );

      const primaryMail = data.included?.find(
        item => item.type === 'Email' && item.attributes.primary
      );

      return {
        id: person.id,
        name: person.attributes.name,
        email: primaryMail?.attributes.address || person.attributes.login_identifier,
        avatar: person.attributes.avatar,
        birthdate: person.attributes.birthdate,
        created_at: person.attributes.created_at,
        phone_number: primaryPhone?.attributes.number,
      };
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new HttpException(
          error.response?.data?.message || 'Erro ao buscar pessoa no PCS',
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
      throw error;
    }
  }

  async buscarMinisterios(personId: string): Promise<TagsMinisteriosDTO> {
    try {
      const url = `${this.baseUrl}/services/v2/people/${personId}/tags`;

      const { data } = await firstValueFrom(
        this.httpService.get<PCSTagResponse>(url, {
          headers: {
            Authorization: `Basic ${this.auth}`,
            Accept: 'application/json',
          },
        })
      );

      const ministerios = data.data
        .filter(tag => tag.relationships.tag_group.data.id === this.MINISTERIO_GROUP_ID)
        .map(tag => ({
          id: tag.id,
          name: tag.attributes.name,
        }));

      const status = data.data.find(
        tag => tag.relationships.tag_group.data.id === this.STATUS_GROUP_ID
      );

      return {
        ministerios,
        status_id: status?.id || '',
        status_name: status?.attributes.name || '',
      };
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new HttpException(
          error.response?.data?.message || 'Erro ao buscar ministérios no PCS',
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
      throw error;
    }
  }

  async buscarPessoaCompleta(personId: string): Promise<PCSFullPersonDTO | null> {
    try {
      const url = `${this.baseUrl}/people/v2/people/${personId}`;
      const params = {
        include: 'emails,field_data,phone_numbers'
      };

      const { data } = await firstValueFrom(
        this.httpService.get(url, {
          params,
          headers: {
            Authorization: `Basic ${this.auth}`,
            Accept: 'application/json',
          },
        })
      );

      if (!data.data) {
        return null;
      }

      const person = data.data;
      const primaryEmail = data.included?.find(
        item => item.type === 'Email' && item.attributes.primary
      );

      const primaryPhone = data.included?.find(
        item => item.type === 'PhoneNumber' && item.attributes.primary
      );

      const ministerios = data.included
        ?.filter(
          item =>
            item.type === 'FieldDatum' &&
            item.relationships?.field_definition?.data?.id === '528454'
        )
        .map(item => item.attributes.value) || [];

      const celula = data.included?.find(
        item =>
          item.type === 'FieldDatum' &&
          item.relationships?.field_definition?.data?.id === '630726'
      )?.attributes.value || '';

      const serveDesde = data.included?.find(
        item =>
          item.type === 'FieldDatum' &&
          item.relationships?.field_definition?.data?.id === '754076'
      )?.attributes.value || '';

      return {
        id: person.id,
        attributes: person.attributes,
        email: primaryEmail?.attributes.address || person.attributes.login_identifier || '',
        phone: primaryPhone?.attributes.number || '',
        ministerios,
        celula,
        serveDesde,
      };
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new HttpException(
          error.response?.data?.message || 'Erro ao buscar pessoa completa no PCS',
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
      throw error;
    }
  }

  async buscarPessoaServices(personId: string): Promise<PCSServicesPersonDTO | null> {
    try {
      const url = `${this.baseUrl}/services/v2/people/${personId}`;

      const { data } = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            Authorization: `Basic ${this.auth}`,
            Accept: 'application/json',
          },
        })
      );

      if (!data.data) {
        return null;
      }

      const person = data.data;
      const attrs = person.attributes;

      return {
        id: person.id,
        first_name: attrs.first_name,
        last_name: attrs.last_name,
        full_name: attrs.full_name,
        birthdate: attrs.birthdate ?? null,
        status: attrs.status,
        permissions: attrs.permissions,
        archived: attrs.archived,
        archived_at: attrs.archived_at ?? null,
        photo_url: attrs.photo_url,
        photo_thumbnail_url: attrs.photo_thumbnail_url,
        created_at: attrs.created_at,
        updated_at: attrs.updated_at,
      };
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new HttpException(
          error.response?.data?.message || 'Erro ao buscar pessoa no PCS Services',
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
      throw error;
    }
  }

  async desarquivarPessoa(personId: string): Promise<void> {
    try {
      const url = `${this.baseUrl}/services/v2/people/${personId}`;
      const body = {
        data: {
          attributes: {
            permissions: 'Scheduled Viewer',
          },
        },
      };

      await firstValueFrom(
        this.httpService.patch(url, body, {
          headers: {
            Authorization: `Basic ${this.auth}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        })
      );
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new HttpException(
          error.response?.data?.message || 'Erro ao desarquivar pessoa no PCS Services',
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
      throw error;
    }
  }

  async adicionarPessoa(firstName: string, lastName: string, birthdate: string): Promise<string> {
    try {
      const url = `${this.baseUrl}/people/v2/people`;
      const body = {
        data: {
          type: 'Person',
          attributes: {
            first_name: firstName,
            last_name: lastName,
            accounting_administrator: false,
            birthdate,
            site_administrator: false,
          },
        },
      };

      const { data } = await firstValueFrom(
        this.httpService.post(url, body, {
          headers: {
            Authorization: `Basic ${this.auth}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        })
      );

      return data.data.id;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new HttpException(
          error.response?.data?.message || 'Erro ao adicionar pessoa no PCS',
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
      throw error;
    }
  }

  async adicionarEmail(personId: string, email: string): Promise<string> {
    try {
      const url = `${this.baseUrl}/people/v2/people/${personId}/emails`;
      const body = {
        data: {
          attributes: {
            address: email,
            location: 'Home',
            primary: true,
          },
        },
      };

      const { data } = await firstValueFrom(
        this.httpService.post(url, body, {
          headers: {
            Authorization: `Basic ${this.auth}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        })
      );

      return data.data.id;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new HttpException(
          error.response?.data?.message || 'Erro ao adicionar email no PCS',
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
      throw error;
    }
  }

  async adicionarTelefone(personId: string, phoneNumber: string): Promise<string> {
    try {
      const url = `${this.baseUrl}/people/v2/people/${personId}/phone_numbers`;
      const body = {
        data: {
          attributes: {
            number: phoneNumber,
            location: 'Home',
            primary: true,
          },
        },
      };

      const { data } = await firstValueFrom(
        this.httpService.post(url, body, {
          headers: {
            Authorization: `Basic ${this.auth}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        })
      );

      return data.data.id;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new HttpException(
          error.response?.data?.message || 'Erro ao adicionar telefone no PCS',
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
      throw error;
    }
  }

  async adicionarCelula(personId: string, nomeCelula: string): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/people/v2/people/${personId}/field_data`;
      const body = {
        data: {
          attributes: {
            field_definition_id: 630726,
            value: nomeCelula,
          },
        },
      };

      await firstValueFrom(
        this.httpService.post(url, body, {
          headers: {
            Authorization: `Basic ${this.auth}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        })
      );

      return true;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new HttpException(
          error.response?.data?.message || 'Erro ao adicionar célula no PCS',
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
      throw error;
    }
  }

  async adicionarServeDesde(personId: string, ano: number): Promise<boolean> {
    try {
      const currentDate = new Date();
      const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
      const day = '01';
      const year = ano.toString();
      const dataServeDesde = `${month}/${day}/${year}`;

      const url = `${this.baseUrl}/people/v2/people/${personId}/field_data`;
      const body = {
        data: {
          attributes: {
            field_definition_id: 754076,
            value: dataServeDesde,
          },
        },
      };

      await firstValueFrom(
        this.httpService.post(url, body, {
          headers: {
            Authorization: `Basic ${this.auth}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        })
      );

      return true;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new HttpException(
          error.response?.data?.message || 'Erro ao adicionar ServeDesde no PCS',
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
      throw error;
    }
  }

  async adicionarTemporada(personId: string, temporada: string): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/people/v2/people/${personId}/field_data`;
      const body = {
        data: {
          attributes: {
            field_definition_id: 956752,
            value: temporada,
          },
        },
      };

      await firstValueFrom(
        this.httpService.post(url, body, {
          headers: {
            Authorization: `Basic ${this.auth}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        })
      );

      return true;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new HttpException(
          error.response?.data?.message || 'Erro ao adicionar Temporada no PCS',
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
      throw error;
    }
  }

  async buscarFieldDatumTemporada(personId: string): Promise<string | null> {
    try {
      const url = `${this.baseUrl}/people/v2/people/${personId}/field_data`;

      const { data } = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            Authorization: `Basic ${this.auth}`,
            Accept: 'application/json',
          },
        })
      );

      const fieldDatum = (data.data as any[]).find(
        item =>
          item.type === 'FieldDatum' &&
          item.relationships?.field_definition?.data?.id === '956752'
      );

      return fieldDatum?.id ?? null;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new HttpException(
          error.response?.data?.message || 'Erro ao buscar field_data no PCS',
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
      throw error;
    }
  }

  async deletarFieldDatum(personId: string, fieldDatumId: string): Promise<void> {
    try {
      const url = `${this.baseUrl}/people/v2/people/${personId}/field_data/${fieldDatumId}`;

      await firstValueFrom(
        this.httpService.delete(url, {
          headers: {
            Authorization: `Basic ${this.auth}`,
            Accept: 'application/json',
          },
        })
      );
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new HttpException(
          error.response?.data?.message || 'Erro ao deletar field_datum no PCS',
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
      throw error;
    }
  }

  async atualizarTemporada(personId: string, temporada: string): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/people/v2/people/${personId}/field_data`;
      const body = {
        data: {
          attributes: {
            field_definition_id: 956752,
            value: temporada,
          },
          relationships: {
            field_definition: {
              data: {
                type: 'FieldDefinition',
                id: '956752',
              },
            },
          },
        },
      };

      await firstValueFrom(
        this.httpService.patch(url, body, {
          headers: {
            Authorization: `Basic ${this.auth}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        })
      );

      return true;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new HttpException(
          error.response?.data?.message || 'Erro ao atualizar Temporada no PCS',
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
      throw error;
    }
  }

  async atualizarMinisterios(personId: string, ministryIds: string[]): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/services/v2/people/${personId}/assign_tags`;
      const tags: any[] = ministryIds.map(id => ({
        type: 'Tag',
        id,
        relationships: {
          tag_group: {
            data: {
              type: 'TagGroup',
              id: '2189274',
            },
          },
        },
      }));

      // Adicionar tag de status ATIVO
      tags.push({
        type: 'Tag',
        id: '11735387',
        attributes: {
          name: 'ATIVO',
        },
        relationships: {
          tag_group: {
            data: {
              type: 'TagGroup',
              id: '2466959',
            },
          },
        },
      });

      const body = {
        data: {
          type: 'TagAssignment',
          attributes: {},
          relationships: {
            tags: {
              data: tags,
            },
          },
        },
      };

      console.log('Request de atualização de ministérios no PCS:', { personId, ministryIds, body });

      await firstValueFrom(
        this.httpService.post(url, body, {
          headers: {
            Authorization: `Basic ${this.auth}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        })
      );

      return true;
    } catch (error) {
      console.log(error);
      if (error instanceof AxiosError) {
        throw new HttpException(
          error.response?.data?.message || 'Erro ao atualizar ministérios no PCS',
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
      throw error;
    }
  }

  async darPermissaoApp(personId: string): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/people/v2/people/${personId}/person_apps`;
      const body = {
        data: {
          attributes: {
            app_id: 2
          }
        }
      };

      await firstValueFrom(
        this.httpService.post(url, body, {
          headers: {
            Authorization: `Basic ${this.auth}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        })
      );

      return true;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new HttpException(
          error.response?.data?.message || 'Erro ao dar permissão de acesso ao app no PCS',
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
      throw error;
    }
  }

  async buscarVoluntarios(teamId: string): Promise<{id: string, name: string, photo: string, tags: string[]}[]> {
    try {
      const allPeople: {id: string, name: string, photo: string, tags: string[]}[] = [];
      let offset = 0;
      const perPage = 50;
      let totalCount = 0;

      do {
        const url = `${this.baseUrl}/services/v2/teams/${teamId}/people`;
        const params = {
          include: 'tags',
          per_page: perPage,
          offset,
        };

        const { data } = await firstValueFrom(
          this.httpService.get<PCSTeamPeopleResponse>(url, {
            params,
            headers: {
              Authorization: `Basic ${this.auth}`,
              Accept: 'application/json',
            },
          })
        );

        totalCount = data.meta.total_count;
        const people = data.data.map(person => ({
          id: person.id,
          name: person.attributes.full_name,
          photo: person.attributes.photo_url,
          tags: person.tags?.data.map(tag => tag.id) || [],
        }));

        allPeople.push(...people);
        offset += perPage;
      } while (offset < totalCount);

      return allPeople;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new HttpException(
          error.response?.data?.message || 'Erro ao buscar voluntários no PCS',
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
      throw error;
    }
  }
}