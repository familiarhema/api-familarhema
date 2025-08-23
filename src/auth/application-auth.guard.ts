import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { APPLICATION_ID_KEY } from './application-auth.decorator';

@Injectable()
export class ApplicationAuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const applicationId = this.reflector.getAllAndOverride<string>(APPLICATION_ID_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!applicationId) {
      return true; // No application ID required
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.applications?.[applicationId]?.length) {
      throw new UnauthorizedException('User does not have access to this application or has no associated accounts');
    }

    // Set the current account ID from the first account in the application
    request.accountId = user.applications[applicationId][0];
    return true;
  }
}