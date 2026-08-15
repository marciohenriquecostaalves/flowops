import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type ms from 'ms';
import { createHash, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

function hash(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function safeEqual(a: string, b: string) {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: { email, status: 'ACTIVE' },
      include: { roles: { include: { role: true } } },
    });

    if (!user || !safeEqual(user.passwordHash, hash(password))) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    return this.issueTokens(user);
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string; tenantId: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { roles: { include: { role: true } } },
    });

    if (!user?.refreshTokenHash || !safeEqual(user.refreshTokenHash, hash(refreshToken))) {
      throw new UnauthorizedException('Sessão inválida');
    }

    return this.issueTokens(user);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } } },
    });

    if (!user) throw new UnauthorizedException();

    return {
      id: user.id,
      tenantId: user.tenantId,
      name: user.name,
      email: user.email,
      roles: user.roles.map((item) => item.role.name),
    };
  }

  private async issueTokens(user: {
    id: string;
    tenantId: string;
    name: string;
    email: string;
    roles: { role: { name: string } }[];
  }) {
    const payload = {
      sub: user.id,
      tenantId: user.tenantId,
      roles: user.roles.map((item) => item.role.name),
    };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET!,
      expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN ?? '15m') as ms.StringValue,
    });

    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, tenantId: user.tenantId },
      {
        secret: process.env.JWT_REFRESH_SECRET!,
        expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d') as ms.StringValue,
      },
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: hash(refreshToken) },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        tenantId: user.tenantId,
        name: user.name,
        email: user.email,
        roles: payload.roles,
      },
    };
  }
}
