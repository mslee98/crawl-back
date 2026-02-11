import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TokenPayload } from '../auth.types';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TokenPayload => {
    const request = ctx.switchToHttp().getRequest<Request & { user: TokenPayload }>();
    return request.user;
  },
);
