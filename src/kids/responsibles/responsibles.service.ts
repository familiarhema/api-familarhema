import { Injectable } from '@nestjs/common';
import { CreateResponsiblesDto, ResponsiblesBasicResponseDto, ResponsiblesDetailedResponseDto } from './dto/create-responsibles.dto';

@Injectable()
export class ResponsiblesService {
  private responsibles: ResponsiblesDetailedResponseDto[] = [];

  async create(createResponsiblesDto: CreateResponsiblesDto): Promise<ResponsiblesDetailedResponseDto> {
    const newResponsible = {
      id: Math.random().toString(),
      ...createResponsiblesDto,
    };
    this.responsibles.push(newResponsible);
    return newResponsible;
  }

  async getAll(): Promise<ResponsiblesBasicResponseDto[]> {
    return this.responsibles.map(r => ({ id: r.id, name: r.name }));
  }

  async getById(id: string): Promise<ResponsiblesDetailedResponseDto> {
    const responsible = this.responsibles.find(r => r.id === id);
    if (!responsible) {
      throw new Error('Responsible not found');
    }
    return responsible;
  }
}