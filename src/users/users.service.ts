import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserFilterDto } from './dto/user-filter.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findAll(filters: UserFilterDto) {
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .select([
        'user.id',
        'user.name',
        'user.email',
        'user.active',
        'user.blocked',
        'role.name'
      ]);

    if (filters.name) {
      queryBuilder.andWhere('user.name ILIKE :name', { name: `%${filters.name}%` });
    }

    if (filters.email) {
      queryBuilder.andWhere('user.email ILIKE :email', { email: `%${filters.email}%` });
    }

    if (filters.active !== undefined) {
      queryBuilder.andWhere('user.active = :active', { active: filters.active });
    }

    if (filters.blocked !== undefined) {
      queryBuilder.andWhere('user.blocked = :blocked', { blocked: filters.blocked });
    }

    return queryBuilder.getMany();
  }

  async toggleBlock(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    user.blocked = !user.blocked;
    return this.userRepository.save(user);
  }

  async updatePassword(currentUserId: string, dto: UpdatePasswordDto) {

    const user = await this.userRepository.findOne({ where: { id: currentUserId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Senha atual inválida');
    }

    user.password_hash = await bcrypt.hash(dto.newPassword, 10);
    return this.userRepository.save(user);
  }

  async updateRole(currentUserId: string, dto: UpdateRoleDto) {
    const user = await this.userRepository.findOne({ where: { id: currentUserId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    user.role = { id: dto.roleId } as any;
    return this.userRepository.save(user);
  }
}