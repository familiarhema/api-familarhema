import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    try {
      const user = await this.userRepository.findOne({
        where: { email },
        relations: ['role']
      });
      
      if (!user) {
        return null;
      }
      
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      
      if (isPasswordValid) {
        const { password_hash, ...result } = user;
        return result;
      }
      
      return null;
    } catch (error) {
      console.error('Error validating user:', error);
      return null;
    }
  }

  async login(user: any) {
    const userWithRole = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .where('user.id = :userId', { userId: user.id })
      .getOne();

    if (!userWithRole) {
      throw new UnauthorizedException('User not found');
    }

    const payload = {
      email: user.email,
      sub: user.id,
      role: userWithRole.role ? {
        id: userWithRole.role.id,
        name: userWithRole.role.name
      } : null
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async register(name: string, email: string, password: string) {
    try {
      const existingUser = await this.userRepository.findOne({ where: { email } });
      if (existingUser) {
        throw new UnauthorizedException('Email already exists');
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = this.userRepository.create({
        name,
        email,
        password_hash: hashedPassword,
      });

      const savedUser = await this.userRepository.save(user);
      const { password_hash, ...result } = savedUser;
      
      // Create payload with empty role (role should be assigned by admin later)
      const payload = {
        email: result.email,
        sub: result.id,
        role: null
      };

      return {
        ...result,
        access_token: this.jwtService.sign(payload),
      };
    } catch (error) {
      console.error('Error registering user:', error);
      throw error;
    }
  }
}