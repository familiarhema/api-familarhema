import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KidEvent } from '../../entities/kid-event.entity';
import { MykidsIntegrationService } from '../../integrations/mykids/mykids-integration.service';
import { CreateEventsDto, EventsBasicResponseDto, EventsDetailedResponseDto } from './dto/create-events.dto';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(KidEvent)
    private readonly kidEventRepository: Repository<KidEvent>,
    private readonly mykidsService: MykidsIntegrationService,
  ) {}

  async create(createEventsDto: CreateEventsDto): Promise<EventsDetailedResponseDto> {
    const kidEvent = this.kidEventRepository.create({
      name: createEventsDto.name,
      // Note: The entity only has id and name, but DTO has date and description
      // You may need to extend the entity if you want to store date and description
    });

    const savedEvent = await this.kidEventRepository.save(kidEvent);

    return {
      id: savedEvent.id,
      name: savedEvent.name,
      date: createEventsDto.date,
      description: createEventsDto.description,
    };
  }

  async getAll(): Promise<EventsBasicResponseDto[]> {
    const events = await this.kidEventRepository.find();
    return events.map(event => ({
      id: event.id,
      name: event.name,
      date: '', // Since the entity doesn't have date, returning empty string
    }));
  }

  async getById(id: number): Promise<EventsDetailedResponseDto> {
    const event = await this.kidEventRepository.findOne({ where: { id } });
    if (!event) {
      throw new Error('Event not found');
    }
    return {
      id: event.id,
      name: event.name,
      date: '', // Since the entity doesn't have date, returning empty string
      description: '', // Since the entity doesn't have description, returning empty string
    };
  }

  async getRegisteredByAgeAndSex(eventCode: string): Promise<any> {
    const result = await this.mykidsService.buscarInscritosEventos(eventCode);

    if (!result.success || !result.data) {
      return { success: false, message: 'Erro ao buscar inscritos' };
    }

    // Agrupar por idade e sexo
    const grouped = result.data.reduce((acc: any, item: any) => {
      const age = item.IDADE;
      const sex = item.SEXO_CRIANCA;

      if (!acc[age]) {
        acc[age] = {};
      }

      if (!acc[age][sex]) {
        acc[age][sex] = [];
      }

      acc[age][sex].push({
        id_crianca: item.ID_CRIANCA,
        crianca: item.CRIANCA,
        tipo: item.TIPO,
        nce: item.NCE,
        status: item.STATUS,
        id_responsavel: item.ID_RESPONSAVEL,
        responsavel: item.RESPONSAVEL,
        tipo_responsavel: item.TIPO_RESPONSAVEL,
        dt_nascimento_crianca: item.DT_NASCIMENTO_CRIANCA,
        dt_nascimento_responsavel: item.DT_NASCIMENTO_RESPONSAVEL,
        sexo_responsavel: item.SEXO_RESPONSAVEL,
        telefone_principal: item.TELEFONE_PRINCIPAL,
        email_principal: item.EMAIL_PRINCIPAL,
        data_inscricao: item.DATA_INSCRICAO,
      });

      return acc;
    }, {});

    return {
      success: true,
      eventCode,
      groupedByAgeAndSex: grouped,
    };
  }

  async getRegistereds(eventCode: string): Promise<any> {
    const result = await this.mykidsService.buscarInscritosEventos(eventCode);

    if (!result.success || !result.data) {
      return { success: false, message: 'Erro ao buscar inscritos' };
    }

    return {
      success: true,
      eventCode,
      registereds: result.data,
    };
  }
}