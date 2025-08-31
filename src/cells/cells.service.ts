import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cell } from '../entities/cell.entity';
import { CreateCellDto, CellBasicResponseDto, CellDetailedResponseDto } from './dto/create-cell.dto';

@Injectable()
export class CellsService {
  constructor(
    @InjectRepository(Cell)
    private cellsRepository: Repository<Cell>,
  ) {}

  async create(createCellDto: CreateCellDto): Promise<CellDetailedResponseDto> {
    const cell = this.cellsRepository.create({
      name: createCellDto.name,
      day_of_week: createCellDto.dayOfWeek,
      time: createCellDto.time ? new Date(`1970-01-01T${createCellDto.time}`) : null,
      location: createCellDto.location,
      leader: { id: createCellDto.leaderId },
    });

    const savedCell = await this.cellsRepository.save(cell);
    const cellWithLeader = await this.cellsRepository.findOne({
      where: { id: savedCell.id },
      relations: ['leader'],
    });

    return {
      id: cellWithLeader.id,
      name: cellWithLeader.name,
      leader: {
        id: cellWithLeader.leader.id,
        name: cellWithLeader.leader.name,
      },
      dayOfWeek: cellWithLeader.day_of_week,
      time: cellWithLeader.time?.toTimeString().slice(0, 5),
      location: cellWithLeader.location,
    };
  }

  async getAll(): Promise<CellBasicResponseDto[]> {
    const cells = await this.cellsRepository.find({
      select: ['id', 'name'],
    });

    return cells.map(cell => ({
      id: cell.id,
      name: cell.name,
    }));
  }

  async getCellPorId(id: string): Promise<CellDetailedResponseDto> {
    const cell = await this.cellsRepository.findOne({
      where: { id },
      relations: ['leader'],
    });

    if (!cell) {
      throw new NotFoundException('Célula não encontrada');
    }

    return {
      id: cell.id,
      name: cell.name,
      leader: {
        id: cell.leader.id,
        name: cell.leader.name,
      },
      dayOfWeek: cell.day_of_week,
      time: cell.time?.toTimeString().slice(0, 5),
      location: cell.location,
    };
  }
}