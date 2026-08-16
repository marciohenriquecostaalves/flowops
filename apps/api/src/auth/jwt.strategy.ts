import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { defaultAccessAreas } from '../users/dto/create-user.dto';

export type JwtPayload = {
  sub: string;
  tenantId: string;
  roles: string[];
  accessAreas?: string[];
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly prisma: PrismaService) {
    const secretOrKey = process.env.JWT_ACCESS_SECRET;

    if (!secretOrKey) {
      throw new Error('JWT_ACCESS_SECRET não configurado');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, tenantId: payload.tenantId, status: 'ACTIVE' },
      select: {
        id: true,
        accessAreas: true,
        roles: { select: { role: { select: { name: true } } } },
      },
    });
    if (!user) throw new UnauthorizedException('Sessão inválida ou expirada');
    const roles = user.roles.map((item) => item.role.name);
    return {
      ...payload,
      roles,
      accessAreas: user.accessAreas.length ? user.accessAreas : defaultAccessAreas(roles[0] ?? ''),
    };
  }
}
