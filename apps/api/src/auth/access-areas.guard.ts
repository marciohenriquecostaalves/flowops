import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { defaultAccessAreas } from '../users/dto/create-user.dto';
import { ACCESS_AREAS_KEY } from './access-areas.decorator';

@Injectable()
export class AccessAreasGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<string[]>(ACCESS_AREAS_KEY, [context.getHandler(), context.getClass()]);
    if (!required?.length) return true;

    const request = context.switchToHttp().getRequest<{ user?: { roles?: string[]; accessAreas?: string[] } }>();
    const user = request.user;
    if (user?.roles?.includes('ADMIN')) return true;
    const role = user?.roles?.[0] ?? '';
    const accessAreas = user?.accessAreas?.length ? user.accessAreas : defaultAccessAreas(role);
    return required.some((area) => accessAreas.includes(area));
  }
}
