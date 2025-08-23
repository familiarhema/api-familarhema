import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetAccountId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.accountId;
  },
);