import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { hashPassword } from '../auth/password';
import { CreateUserDto, UserRoleName } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: { id: true, name: true, email: true, status: true, createdAt: true, updatedAt: true, roles: { select: { role: { select: { name: true } } } } },
      orderBy: { name: 'asc' },
    });
  }

  async create(tenantId: string, actorId: string, dto: CreateUserDto) {
    const role = await this.roleForTenant(tenantId, dto.role);
    try {
      const user = await this.prisma.user.create({
        data: { tenantId, name: dto.name, email: dto.email.toLowerCase(), passwordHash: hashPassword(dto.password), roles: { create: { roleId: role.id } } },
        select: { id: true, name: true, email: true, status: true, createdAt: true, roles: { select: { role: { select: { name: true } } } } },
      });
      await this.audit(tenantId, actorId, 'USER_CREATED', user.id, { role: dto.role });
      return user;
    } catch {
      throw new ConflictException('Já existe um usuário com este e-mail nesta empresa');
    }
  }

  async update(tenantId: string, actorId: string, id: string, dto: UpdateUserDto) {
    const user = await this.userForTenant(tenantId, id);
    const currentRole = user.roles[0]?.role.name;
    if ((dto.status && dto.status !== 'ACTIVE') || (dto.role && currentRole === 'ADMIN' && dto.role !== 'ADMIN')) await this.ensureAnotherActiveAdmin(tenantId, id);

    const role = dto.role ? await this.roleForTenant(tenantId, dto.role) : undefined;
    let updated;
    try {
      updated = await this.prisma.$transaction(async (tx) => {
        if (role) await tx.userRole.deleteMany({ where: { userId: id } });
        return tx.user.update({
          where: { id },
          data: { ...(dto.name ? { name: dto.name } : {}), ...(dto.email ? { email: dto.email.toLowerCase() } : {}), ...(dto.status ? { status: dto.status, ...(dto.status !== 'ACTIVE' ? { refreshTokenHash: null } : {}) } : {}), ...(role ? { roles: { create: { roleId: role.id } } } : {}) },
          select: { id: true, name: true, email: true, status: true, updatedAt: true, roles: { select: { role: { select: { name: true } } } } },
        });
      });
    } catch {
      throw new ConflictException('Já existe um usuário com este e-mail nesta empresa');
    }
    await this.audit(tenantId, actorId, 'USER_UPDATED', id, { status: dto.status, role: dto.role });
    return updated;
  }

  async resetPassword(tenantId: string, actorId: string, id: string, password: string) {
    await this.userForTenant(tenantId, id);
    await this.prisma.user.update({ where: { id }, data: { passwordHash: hashPassword(password), refreshTokenHash: null } });
    await this.audit(tenantId, actorId, 'USER_PASSWORD_RESET', id);
    return { ok: true };
  }

  async auditLog(tenantId: string, page: number) {
    const pageSize = 10;
    const safePage = Math.max(1, Math.floor(page));
    const where = { tenantId };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({ where, select: { id: true, action: true, entityId: true, metadata: true, createdAt: true, userId: true, user: { select: { name: true, email: true } } }, orderBy: { createdAt: 'desc' }, skip: (safePage - 1) * pageSize, take: pageSize }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items, total, page: safePage, pageSize };
  }

  private async userForTenant(tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({ where: { id, tenantId }, include: { roles: { include: { role: true } } } });
    if (!user) throw new NotFoundException('Usuário não pertence à empresa');
    return user;
  }

  private async roleForTenant(tenantId: string, name: UserRoleName) {
    const role = await this.prisma.role.findFirst({ where: { tenantId, name } });
    if (!role) throw new NotFoundException(`Perfil ${name} não configurado para esta empresa`);
    return role;
  }

  private async ensureAnotherActiveAdmin(tenantId: string, userId: string) {
    const admins = await this.prisma.user.count({ where: { tenantId, id: { not: userId }, status: 'ACTIVE', roles: { some: { role: { name: 'ADMIN' } } } } });
    if (admins === 0) throw new ForbiddenException('A empresa precisa manter ao menos um administrador ativo');
  }

  private audit(tenantId: string, userId: string, action: string, entityId: string, metadata?: object) {
    return this.prisma.auditLog.create({ data: { tenantId, userId, action, entity: 'USER', entityId, metadata } });
  }
}
