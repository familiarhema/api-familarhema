import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Volunteer } from '../entities/volunteer.entity';
import { PCSIntegrationService } from '../integrations/pcs/pcs-integration.service';
import {
  ValidateVolunteerDto,
  ValidateVolunteerResponseDto,
} from './dto/validate-volunteer.dto';

@Injectable()
export class VolunteersService {
  constructor(
    @InjectRepository(Volunteer)
    private volunteersRepository: Repository<Volunteer>,
    private pcsIntegrationService: PCSIntegrationService,
  ) {}

  async validateVolunteer(
    data: ValidateVolunteerDto,
  ): Promise<ValidateVolunteerResponseDto> {
    const existingVolunteer = await this.volunteersRepository.findOne({
      where: [{ email: data.email }, { phone: data.telefone }],
    });

    if (existingVolunteer) {
      if (existingVolunteer.personId) {
        const ministerios = await this.pcsIntegrationService.buscarMinisterios(
          existingVolunteer.personId.toString(),
        );
        return { ministerios: ministerios.ministerios };
      }
      return { ministerios: [] };
    }

    let pcsUser = await this.pcsIntegrationService.buscarPessoaTelefoneEmail(
      data.email,
    );

    if (!pcsUser) {
      pcsUser = await this.pcsIntegrationService.buscarPessoaTelefoneEmail(
        data.telefone,
      );
    }

    if (pcsUser) {
      await this.volunteersRepository.save({
        name: pcsUser.name,
        email: pcsUser.email,
        phone: pcsUser.phone_number,
        birth_date: new Date(pcsUser.birthdate),
        photo: pcsUser.avatar,
        registration_date: new Date(pcsUser.created_at),
        status: 'Active',
        personId: Number(pcsUser.id),
      });

      const ministerios = await this.pcsIntegrationService.buscarMinisterios(
        pcsUser.id,
      );
      return { ministerios: ministerios.ministerios };
    } else {
      await this.volunteersRepository.save({
        name: data.nome,
        email: data.email,
        phone: data.telefone,
        birth_date: new Date(data.dataNascimento),
        status: 'Active',
        registration_date: new Date(),
      });

      return { ministerios: [] };
    }
  }
}