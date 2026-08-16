import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { canAccessUnit, scopedUnitWhere } from '../auth/unit-scope';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, roles: string[] = [], unitIds: string[] = [], selectedUnitId?: string) {
    return this.prisma.department.findMany({
      where: scopedUnitWhere(tenantId, roles, unitIds, selectedUnitId),
      include: { unit: { select: { id: true, code: true, name: true } }, _count: { select: { employees: true, activities: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async create(tenantId: string, actorUserId: string, dto: CreateDepartmentDto, roles: string[] = [], unitIds: string[] = [], primaryUnitId?: string) {
    const unitId = dto.unitId ?? primaryUnitId;
    if (!unitId || !canAccessUnit(roles, unitIds, unitId)) throw new ForbiddenException('Selecione uma filial permitida');
    const unit = await this.prisma.businessUnit.findFirst({ where: { id: unitId, tenantId, active: true } });
    if (!unit) throw new NotFoundException('Filial não pertence à empresa ou está inativa');
    try {
      const department = await this.prisma.department.create({
        data: { tenantId, unitId, name: dto.name },
      });
      await this.audit(tenantId, actorUserId, 'DEPARTMENT_CREATED', department.id, { name: department.name });
      return department;
    } catch {
      throw new ConflictException('Departamento já existe');
    }
  }

  async update(tenantId: string, actorUserId: string, id: string, dto: UpdateDepartmentDto, roles: string[] = [], unitIds: string[] = [], selectedUnitId?: string) {
    const department = await this.prisma.department.findFirst({ where: { id, ...scopedUnitWhere(tenantId, roles, unitIds, selectedUnitId) } });
    if (!department) throw new NotFoundException('Departamento não pertence à empresa');
    if (dto.unitId && dto.unitId !== department.unitId) {
      if (!canAccessUnit(roles, unitIds, dto.unitId)) throw new ForbiddenException('Filial não permitida');
      if (!await this.prisma.businessUnit.findFirst({ where: { id: dto.unitId, tenantId, active: true } })) throw new NotFoundException('Filial não pertence à empresa ou está inativa');
      const linked = await this.prisma.department.findUnique({ where: { id }, include: { _count: { select: { employees: true, activities: true } } } });
      if (linked && (linked._count.employees || linked._count.activities)) throw new ConflictException('Não é possível mover um departamento com vínculos ativos');
    }

    try {
      const updated = await this.prisma.department.update({ where: { id }, data: { name: dto.name, ...(dto.unitId ? { unitId: dto.unitId } : {}) } });
      await this.audit(tenantId, actorUserId, 'DEPARTMENT_UPDATED', id, {
        name: updated.name,
        before: { name: department.name },
        after: { name: updated.name },
      });
      return updated;
    } catch {
      throw new ConflictException('Não foi possível atualizar o departamento');
    }
  }

  async remove(tenantId: string, actorUserId: string, id: string, roles: string[] = [], unitIds: string[] = [], selectedUnitId?: string) {
    const department = await this.prisma.department.findFirst({
      where: { id, ...scopedUnitWhere(tenantId, roles, unitIds, selectedUnitId) },
      include: { _count: { select: { employees: true, activities: true } } },
    });
    if (!department) throw new NotFoundException('Departamento não pertence à empresa');
    if (department._count.employees || department._count.activities) {
      throw new ConflictException('Não é possível excluir um departamento com vínculos ativos');
    }
    await this.prisma.department.delete({ where: { id } });
    await this.audit(tenantId, actorUserId, 'DEPARTMENT_DELETED', id, { name: department.name });
    return { deleted: true };
  }

  private audit(tenantId: string, userId: string, action: string, entityId: string, metadata: { name: string; before?: object; after?: object }) { return this.prisma.auditLog.create({ data: { tenantId, userId, action, entity: 'DEPARTMENT', entityId, metadata } }); }
}
