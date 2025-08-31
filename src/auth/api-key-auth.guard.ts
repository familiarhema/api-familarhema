import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ALLOW_API_KEY } from './api-key-auth.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Observable, from, of } from 'rxjs';

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
    private jwtAuthGuard: JwtAuthGuard,
  ) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    console.log('1. Iniciando validação do ApiKeyAuthGuard');
    
    const allowApiKey = this.reflector.getAllAndOverride<boolean>(
      ALLOW_API_KEY,
      [context.getHandler(), context.getClass()],
    );

    console.log('2. @AllowApiKey presente?', allowApiKey);

    if (!allowApiKey) {
      console.log('3. Rota não aceita API Key, usando JWT');
      return this.jwtAuthGuard.canActivate(context);
    }

    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    console.log('4. API Key encontrada no header:', apiKey ? 'Sim' : 'Não');

    if (!apiKey) {
      console.log('5. Sem API Key, usando JWT');
      return this.jwtAuthGuard.canActivate(context);
    }

    const validApiKeys = this.configService.get<string>('VALID_API_KEYS')?.split(',') || [];
    
    console.log('6. Validando API Key:', {
      receivedKey: apiKey,
      configuredKeys: validApiKeys,
      isValid: validApiKeys.includes(apiKey)
    });

    if (!validApiKeys.includes(apiKey)) {
      console.log('7. API Key inválida');
      throw new UnauthorizedException('Invalid API Key');
    }

    console.log('8. API Key válida, autorizando acesso');
    request.isApiKeyAuth = true;
    return true;
  }
}