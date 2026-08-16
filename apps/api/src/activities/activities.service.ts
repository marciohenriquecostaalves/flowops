import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { canAccessUnit, scopedUnitWhere } from '../auth/unit-scope';

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, roles: string[] = [], unitIds: string[] = [], selectedUnitId?: string) {
    return this.prisma.activity.findMany({
      where: scopedUnitWhere(tenantId, roles, unitIds, selectedUnitId),
      include: { department: true, unit: { select: { id: true, code: true, name: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async create(tenantId: string, actorUserId: string, dto: CreateActivityDto, roles: string[] = [], unitIds: string[] = [], primaryUnitId?: string) {
    const unitId = dto.unitId ?? primaryUnitId;
    if (!unitId || !canAccessUnit(roles, unitIds, unitId)) throw new ForbiddenException('Selecione uma filial permitida');
    if (!await this.prisma.businessUnit.findFirst({ where: { id: unitId, tenantId, active: true } })) throw new NotFoundException('Filial não pertence à empresa ou está inativa');
    if (dto.departmentId) {
      const department = await this.prisma.department.findFirst({
        where: { id: dto.departmentId, tenantId, unitId },
      });
      if (!department) throw new NotFoundException('Departamento não encontrado');
    }

    try {
      const activity = await this.prisma.activity.create({
        data: {
          tenantId,
          unitId,
          name: dto.name,
          code: dto.code,
          departmentId: dto.departmentId,
          targetPerHour: dto.targetPerHour,
        },
      });
      await this.audit(tenantId, actorUserId, 'ACTIVITY_CREATED', activity.id, { name: activity.name });
      return activity;
    } catch {
      throw new ConflictException('Código de atividade já existe');
    }
  }

  async update(tenantId: string, actorUserId: string, id: string, dto: UpdateActivityDto, roles: string[] = [], unitIds: string[] = [], selectedUnitId?: string) {
    const activity = await this.prisma.activity.findFirst({ where: { id, ...scopedUnitWhere(tenantId, roles, unitIds, selectedUnitId) } });
    if (!activity) throw new NotFoundException('Atividade não encontrada');
    const unitId = dto.unitId ?? activity.unitId;
    if (!unitId || !canAccessUnit(roles, unitIds, unitId)) throw new ForbiddenException('Filial não permitida');
    if (dto.unitId && dto.unitId !== activity.unitId && !await this.prisma.businessUnit.findFirst({ where: { id: dto.unitId, tenantId, active: true } })) throw new NotFoundException('Filial não pertence à empresa ou está inativa');
    if (dto.departmentId) {
      const department = await this.prisma.department.findFirst({ where: { id: dto.departmentId, tenantId, unitId } });
      if (!department) throw new NotFoundException('Departamento não encontrado nesta filial');
    }

    const updated = await this.prisma.activity.update({
      where: { id },
      data: {
        name: dto.name,
        status: dto.active === undefined ? undefined : dto.active ? 'ACTIVE' : 'INACTIVE',
        targetPerHour: dto.targetPerHour,
        ...(dto.departmentId !== undefined ? { departmentId: dto.departmentId } : {}),
        ...(dto.unitId ? { unitId: dto.unitId } : {}),
      },
    });
    await this.audit(tenantId, actorUserId, 'ACTIVITY_UPDATED', id, {
      name: updated.name,
      before: { name: activity.name, status: activity.status, targetPerHour: activity.targetPerHour?.toString() ?? null, departmentId: activity.departmentId },
      after: { name: updated.name, status: updated.status, targetPerHour: updated.targetPerHour?.toString() ?? null, departmentId: updated.departmentId },
    });
    return updated;
  }

  private audit(tenantId: string, userId: string, action: string, entityId: string, metadata: { name: string; before?: object; after?: object }) { return this.prisma.auditLog.create({ data: { tenantId, userId, action, entity: 'ACTIVITY', entityId, metadata } }); }
}
