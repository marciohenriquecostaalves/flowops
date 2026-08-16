import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { canAccessUnit, scopedUnitWhere } from '../auth/unit-scope';

@Injectable()
export class ShiftsService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, roles: string[] = [], unitIds: string[] = []) {
    return this.prisma.shift.findMany({
      where: scopedUnitWhere(tenantId, roles, unitIds),
      include: { unit: { select: { id: true, code: true, name: true } }, _count: { select: { employees: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async create(tenantId: string, actorUserId: string, dto: CreateShiftDto, roles: string[] = [], unitIds: string[] = [], primaryUnitId?: string) {
    const unitId = dto.unitId ?? primaryUnitId;
    if (!unitId || !canAccessUnit(roles, unitIds, unitId)) throw new ForbiddenException('Selecione uma filial permitida');
    if (!await this.prisma.businessUnit.findFirst({ where: { id: unitId, tenantId, active: true } })) throw new NotFoundException('Filial não pertence à empresa ou está inativa');
    try {
      const shift = await this.prisma.shift.create({ data: { tenantId, unitId, name: dto.name, startTime: dto.startTime, endTime: dto.endTime, toleranceMinutes: dto.toleranceMinutes } });
      await this.audit(tenantId, actorUserId, 'SHIFT_CREATED', shift.id, { name: shift.name });
      return shift;
    } catch {
      throw new ConflictException('Turno já existe');
    }
  }

  async update(tenantId: string, actorUserId: string, id: string, dto: UpdateShiftDto, roles: string[] = [], unitIds: string[] = []) {
    const shift = await this.prisma.shift.findFirst({ where: { id, ...scopedUnitWhere(tenantId, roles, unitIds) } });
    if (!shift) throw new NotFoundException('Turno não pertence à empresa');
    if (dto.unitId && dto.unitId !== shift.unitId) {
      if (!canAccessUnit(roles, unitIds, dto.unitId)) throw new ForbiddenException('Filial não permitida');
      if (!await this.prisma.businessUnit.findFirst({ where: { id: dto.unitId, tenantId, active: true } })) throw new NotFoundException('Filial não pertence à empresa ou está inativa');
      const linked = await this.prisma.shift.findUnique({ where: { id }, include: { _count: { select: { employees: true } } } });
      if (linked && linked._count.employees) throw new ConflictException('Não é possível mover um turno com colaboradores vinculados');
    }

    try {
      const updated = await this.prisma.shift.update({ where: { id }, data: dto });
      await this.audit(tenantId, actorUserId, 'SHIFT_UPDATED', id, {
        name: updated.name,
        before: { name: shift.name, startTime: shift.startTime, endTime: shift.endTime, toleranceMinutes: shift.toleranceMinutes, active: shift.active },
        after: { name: updated.name, startTime: updated.startTime, endTime: updated.endTime, toleranceMinutes: updated.toleranceMinutes, active: updated.active },
      });
      return updated;
    } catch {
      throw new ConflictException('Não foi possível atualizar o turno');
    }
  }

  private audit(tenantId: string, userId: string, action: string, entityId: string, metadata: { name: string; before?: object; after?: object }) { return this.prisma.auditLog.create({ data: { tenantId, userId, action, entity: 'SHIFT', entityId, metadata } }); }
}
