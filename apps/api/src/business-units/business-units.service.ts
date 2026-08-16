import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusinessUnitDto } from './dto/create-business-unit.dto';
import { UpdateBusinessUnitDto } from './dto/update-business-unit.dto';
import { scopedUnitWhere } from '../auth/unit-scope';

@Injectable()
export class BusinessUnitsService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, roles: string[] = [], unitIds: string[] = []) {
    return this.prisma.businessUnit.findMany({
      where: scopedUnitWhere(tenantId, roles, unitIds),
      include: {
        parent: { select: { id: true, code: true, name: true } },
        _count: { select: { children: true, employees: true, departments: true, userAccess: true } },
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
  }

  async create(tenantId: string, actorUserId: string, dto: CreateBusinessUnitDto) {
    const code = dto.code.trim().toUpperCase();
    await this.assertParent(tenantId, dto.parentId);
    try {
      const unit = await this.prisma.businessUnit.create({
        data: { tenantId, name: dto.name.trim(), code, parentId: dto.parentId, type: dto.type ?? 'BRANCH' },
      });
      await this.audit(tenantId, actorUserId, 'BUSINESS_UNIT_CREATED', unit.id, { name: unit.name, code: unit.code });
      return unit;
    } catch {
      throw new ConflictException('Já existe uma unidade com este código nesta empresa');
    }
  }

  async update(tenantId: string, actorUserId: string, id: string, dto: UpdateBusinessUnitDto) {
    const current = await this.prisma.businessUnit.findFirst({ where: { id, tenantId } });
    if (!current) throw new NotFoundException('Unidade não pertence à empresa');
    if (dto.parentId === id) throw new ConflictException('Uma unidade não pode ser sua própria matriz');
    await this.assertParent(tenantId, dto.parentId);
    if (dto.parentId && await this.isDescendant(id, dto.parentId)) throw new ConflictException('A unidade não pode ficar abaixo de uma filial descendente');
    try {
      const updated = await this.prisma.businessUnit.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.code !== undefined ? { code: dto.code.trim().toUpperCase() } : {}),
          ...(dto.parentId !== undefined ? { parentId: dto.parentId } : {}),
          ...(dto.type !== undefined ? { type: dto.type } : {}),
          ...(dto.active !== undefined ? { active: dto.active } : {}),
        },
      });
      await this.audit(tenantId, actorUserId, 'BUSINESS_UNIT_UPDATED', id, { before: { name: current.name, code: current.code, parentId: current.parentId, active: current.active }, after: { name: updated.name, code: updated.code, parentId: updated.parentId, active: updated.active } });
      return updated;
    } catch {
      throw new ConflictException('Não foi possível atualizar a unidade');
    }
  }

  async remove(tenantId: string, actorUserId: string, id: string) {
    const unit = await this.prisma.businessUnit.findFirst({ where: { id, tenantId }, include: { _count: { select: { children: true, employees: true, departments: true, shifts: true, activities: true, sessions: true, kioskDevices: true, productionPunches: true, jobTitles: true, userAccess: true } } } });
    if (!unit) throw new NotFoundException('Unidade não pertence à empresa');
    if (unit.type === 'HEADQUARTERS') throw new ConflictException('A matriz padrão não pode ser excluída');
    if (Object.values(unit._count).some((value) => value > 0)) throw new ConflictException('Não é possível excluir uma unidade com vínculos. Desative-a para preservar o histórico.');
    await this.prisma.businessUnit.delete({ where: { id } });
    await this.audit(tenantId, actorUserId, 'BUSINESS_UNIT_DELETED', id, { name: unit.name, code: unit.code });
    return { deleted: true };
  }

  private async assertParent(tenantId: string, parentId?: string | null) {
    if (!parentId) return;
    const parent = await this.prisma.businessUnit.findFirst({ where: { id: parentId, tenantId } });
    if (!parent) throw new NotFoundException('Unidade matriz não encontrada nesta empresa');
  }

  private async isDescendant(ancestorId: string, candidateParentId: string) {
    let currentId: string | null = candidateParentId;
    while (currentId) {
      if (currentId === ancestorId) return true;
      const current: { parentId: string | null } | null = await this.prisma.businessUnit.findUnique({ where: { id: currentId }, select: { parentId: true } });
      currentId = current?.parentId ?? null;
    }
    return false;
  }

  private audit(tenantId: string, userId: string, action: string, entityId: string, metadata: object) {
    return this.prisma.auditLog.create({ data: { tenantId, userId, action, entity: 'BUSINESS_UNIT', entityId, metadata } });
  }
}
