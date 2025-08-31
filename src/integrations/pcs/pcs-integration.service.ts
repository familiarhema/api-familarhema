import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { PCSPersonResponse, PCSPersonDTO } from './interfaces/person.interface';
import { PCSTagResponse, TagsMinisteriosDTO } from './interfaces/tag.interface';

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
        'include': 'phone_numbers'
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

      return {
        id: person.id,
        name: person.attributes.name,
        email: person.attributes.login_identifier,
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
}