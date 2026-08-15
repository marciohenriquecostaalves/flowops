import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type ms from 'ms';
import { createHash, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { hashPassword, verifyPassword } from './password';

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

    if (!user || !verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (!user.passwordHash.startsWith('scrypt$')) {
      await this.prisma.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(password) } });
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

    if (!user?.refreshTokenHash || !verifyToken(refreshToken, user.refreshTokenHash)) {
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
      data: { refreshTokenHash: hashToken(refreshToken) },
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

function hashToken(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function verifyToken(value: string, storedHash: string) {
  const current = Buffer.from(hashToken(value));
  const stored = Buffer.from(storedHash);
  return current.length === stored.length && timingSafeEqual(current, stored);
}
