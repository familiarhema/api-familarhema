import { Injectable } from '@nestjs/common';
import { CreateChildrensDto, ChildrensBasicResponseDto, ChildrensDetailedResponseDto } from './dto/create-childrens.dto';

@Injectable()
export class ChildrensService {
  // Placeholder: assuming no entity yet, using in-memory or something
  private childrens: ChildrensDetailedResponseDto[] = [];

  async create(createChildrensDto: CreateChildrensDto): Promise<ChildrensDetailedResponseDto> {
    const newChildren = {
      id: Math.random().toString(),
      ...createChildrensDto,
    };
    this.childrens.push(newChildren);
    return newChildren;
  }

  async getAll(): Promise<ChildrensBasicResponseDto[]> {
    return this.childrens.map(c => ({ id: c.id, name: c.name, age: c.age }));
  }

  async getById(id: string): Promise<ChildrensDetailedResponseDto> {
    const children = this.childrens.find(c => c.id === id);
    if (!children) {
      throw new Error('Children not found');
    }
    return children;
  }
}