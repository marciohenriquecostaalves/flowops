import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { hashPassword } from '../auth/password';
import { CreateUserDto, defaultAccessAreas, UserRoleName } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId, status: 'ACTIVE' },
      select: { id: true, name: true, email: true, status: true, createdAt: true, updatedAt: true, accessAreas: true, employee: { select: { id: true, name: true, employeeCode: true } }, roles: { select: { role: { select: { name: true } } } } },
      orderBy: { name: 'asc' },
    });
  }

  async create(tenantId: string, actorId: string, dto: CreateUserDto) {
    const role = await this.roleForTenant(tenantId, dto.role);
    const primaryUnit = await this.primaryUnitForTenant(tenantId);
    if (['OPERATOR', 'FOREMAN'].includes(dto.role) && !dto.employeeId) throw new ConflictException(`Associe um colaborador ao usuário ${dto.role === 'FOREMAN' ? 'Encarregado' : 'Operador'}`);
    if (dto.employeeId) await this.employeeAvailable(tenantId, dto.employeeId);
    if (dto.role === 'FOREMAN') await this.ensureEmployeeDepartment(tenantId, dto.employeeId!);
    const existing = await this.prisma.user.findUnique({ where: { tenantId_email: { tenantId, email: dto.email.toLowerCase() } } });
    if (existing?.status === 'SUSPENDED') {
      const user = await this.prisma.$transaction(async (tx) => {
        await tx.userRole.deleteMany({ where: { userId: existing.id } });
        await tx.userUnitAccess.upsert({ where: { userId_unitId: { userId: existing.id, unitId: primaryUnit.id } }, update: { isPrimary: true }, create: { userId: existing.id, unitId: primaryUnit.id, isPrimary: true } });
        return tx.user.update({
          where: { id: existing.id },
          data: { name: dto.name, passwordHash: hashPassword(dto.password), status: 'ACTIVE', refreshTokenHash: null, accessAreas: dto.accessAreas ?? defaultAccessAreas(dto.role), ...(dto.employeeId ? { employee: { connect: { id: dto.employeeId } } } : {}), roles: { create: { roleId: role.id } } },
          select: { id: true, name: true, email: true, status: true, createdAt: true, accessAreas: true, roles: { select: { role: { select: { name: true } } } } },
        });
      });
      await this.audit(tenantId, actorId, 'USER_ACCESS_REACTIVATED', user.id, { role: dto.role });
      return user;
    }
    if (existing) throw new ConflictException('Já existe um usuário com este e-mail nesta empresa');
    try {
      const user = await this.prisma.user.create({
        data: { tenantId, name: dto.name, email: dto.email.toLowerCase(), passwordHash: hashPassword(dto.password), accessAreas: dto.accessAreas ?? defaultAccessAreas(dto.role), ...(dto.employeeId ? { employee: { connect: { id: dto.employeeId } } } : {}), roles: { create: { roleId: role.id } }, unitAccess: { create: { unitId: primaryUnit.id, isPrimary: true } } },
        select: { id: true, name: true, email: true, status: true, createdAt: true, accessAreas: true, roles: { select: { role: { select: { name: true } } } } },
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
    const finalRole = dto.role ?? currentRole;
    const finalEmployeeId = dto.employeeId === undefined ? user.employee?.id : dto.employeeId;
    if (['OPERATOR', 'FOREMAN'].includes(finalRole ?? '') && !finalEmployeeId) throw new ConflictException(`Associe um colaborador ao usuário ${finalRole === 'FOREMAN' ? 'Encarregado' : 'Operador'}`);
    if (dto.employeeId) await this.employeeAvailable(tenantId, dto.employeeId, id);
    if (finalRole === 'FOREMAN') await this.ensureEmployeeDepartment(tenantId, finalEmployeeId!);
    let updated;
    try {
      updated = await this.prisma.$transaction(async (tx) => {
        if (role) await tx.userRole.deleteMany({ where: { userId: id } });
        return tx.user.update({
          where: { id },
          data: { ...(dto.name ? { name: dto.name } : {}), ...(dto.email ? { email: dto.email.toLowerCase() } : {}), ...(dto.status ? { status: dto.status, ...(dto.status !== 'ACTIVE' ? { refreshTokenHash: null } : {}) } : {}), ...(dto.accessAreas !== undefined ? { accessAreas: dto.accessAreas } : {}), ...(dto.employeeId !== undefined ? (dto.employeeId ? { employee: { connect: { id: dto.employeeId } } } : { employee: { disconnect: true } }) : {}), ...(role ? { roles: { create: { roleId: role.id } } } : {}) },
          select: { id: true, name: true, email: true, status: true, accessAreas: true, updatedAt: true, roles: { select: { role: { select: { name: true } } } } },
        });
      });
    } catch {
      throw new ConflictException('Já existe um usuário com este e-mail nesta empresa');
    }
    await this.audit(tenantId, actorId, 'USER_UPDATED', id, {
      before: {
        name: user.name,
        email: user.email,
        status: user.status,
        role: currentRole,
        employeeId: user.employee?.id ?? null,
        accessAreas: user.accessAreas,
      },
      after: {
        name: updated.name,
        email: updated.email,
        status: updated.status,
        role: updated.roles?.[0]?.role?.name ?? currentRole,
        employeeId: finalEmployeeId ?? null,
        accessAreas: updated.accessAreas,
      },
    });
    return updated;
  }

  async resetPassword(tenantId: string, actorId: string, id: string, password: string) {
    await this.userForTenant(tenantId, id);
    await this.prisma.user.update({ where: { id }, data: { passwordHash: hashPassword(password), refreshTokenHash: null } });
    await this.audit(tenantId, actorId, 'USER_PASSWORD_RESET', id);
    return { ok: true };
  }

  async revokeEmployeeAccess(tenantId: string, actorId: string, employeeId: string) {
    const employee = await this.prisma.employee.findFirst({ where: { id: employeeId, tenantId } });
    if (!employee) throw new NotFoundException('Colaborador não encontrado');
    if (!employee.userId) return { ok: true };
    await this.prisma.$transaction([this.prisma.activitySession.updateMany({ where: { tenantId, employeeId, status: { in: ['RUNNING', 'PAUSED'] } }, data: { status: 'CANCELLED', endedAt: new Date(), pausedAt: null } }), this.prisma.user.update({ where: { id: employee.userId }, data: { status: 'SUSPENDED', refreshTokenHash: null } }), this.prisma.employee.update({ where: { id: employeeId }, data: { userId: null } })]);
    await this.audit(tenantId, actorId, 'USER_ACCESS_REVOKED', employee.userId, { employee: employee.name });
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
    const user = await this.prisma.user.findFirst({ where: { id, tenantId }, include: { employee: true, roles: { include: { role: true } } } });
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

  private async employeeAvailable(tenantId: string, employeeId: string, userId?: string) {
    const employee = await this.prisma.employee.findFirst({ where: { id: employeeId, tenantId } });
    if (!employee || (employee.userId && employee.userId !== userId)) throw new ConflictException('Este colaborador já está associado a outro usuário');
  }

  private async ensureEmployeeDepartment(tenantId: string, employeeId: string) {
    const employee = await this.prisma.employee.findFirst({ where: { id: employeeId, tenantId }, select: { departmentId: true } });
    if (!employee?.departmentId) throw new ConflictException('Associe o encarregado a um colaborador com departamento definido');
  }

  private async primaryUnitForTenant(tenantId: string) {
    const unit = await this.prisma.businessUnit.findFirst({ where: { tenantId, type: 'HEADQUARTERS', active: true }, orderBy: { createdAt: 'asc' } });
    if (unit) return unit;
    return this.prisma.businessUnit.create({ data: { tenantId, code: 'MATRIZ', name: 'Matriz', type: 'HEADQUARTERS' } });
  }

  private audit(tenantId: string, userId: string, action: string, entityId: string, metadata?: object) {
    return this.prisma.auditLog.create({ data: { tenantId, userId, action, entity: 'USER', entityId, metadata } });
  }
}
