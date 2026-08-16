import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobTitleDto } from './dto/create-job-title.dto';
import { UpdateJobTitleDto } from './dto/update-job-title.dto';
import { canAccessUnit, scopedUnitWhere } from '../auth/unit-scope';

@Injectable()
export class JobTitlesService {
  constructor(private readonly prisma: PrismaService) {}
  list(tenantId: string, roles: string[] = [], unitIds: string[] = []) { return this.prisma.jobTitle.findMany({ where: scopedUnitWhere(tenantId, roles, unitIds), include: { unit: { select: { id: true, code: true, name: true } }, _count: { select: { employees: true } } }, orderBy: { name: 'asc' } }); }
  async create(tenantId: string, actorUserId: string, dto: CreateJobTitleDto, roles: string[] = [], unitIds: string[] = [], primaryUnitId?: string) {
    const unitId = dto.unitId ?? primaryUnitId;
    if (!unitId || !canAccessUnit(roles, unitIds, unitId)) throw new ForbiddenException('Selecione uma filial permitida');
    if (!await this.prisma.businessUnit.findFirst({ where: { id: unitId, tenantId, active: true } })) throw new NotFoundException('Filial não pertence à empresa ou está inativa');
    try { const jobTitle = await this.prisma.jobTitle.create({ data: { tenantId, unitId, name: dto.name } }); await this.audit(tenantId, actorUserId, 'JOB_TITLE_CREATED', jobTitle.id, { name: jobTitle.name }); return jobTitle; }
    catch { throw new ConflictException('Cargo já existe'); }
  }
  async update(tenantId: string, actorUserId: string, id: string, dto: UpdateJobTitleDto, roles: string[] = [], unitIds: string[] = []) {
    const jobTitle = await this.prisma.jobTitle.findFirst({ where: { id, ...scopedUnitWhere(tenantId, roles, unitIds) } });
    if (!jobTitle) throw new NotFoundException('Cargo não pertence à empresa');
    if (dto.unitId && dto.unitId !== jobTitle.unitId) {
      if (!canAccessUnit(roles, unitIds, dto.unitId)) throw new ForbiddenException('Filial não permitida');
      if (!await this.prisma.businessUnit.findFirst({ where: { id: dto.unitId, tenantId, active: true } })) throw new NotFoundException('Filial não pertence à empresa ou está inativa');
      const linked = await this.prisma.jobTitle.findUnique({ where: { id }, include: { _count: { select: { employees: true } } } });
      if (linked && linked._count.employees) throw new ConflictException('Não é possível mover um cargo com colaboradores vinculados');
    }
    try { const updated = await this.prisma.jobTitle.update({ where: { id }, data: dto }); await this.audit(tenantId, actorUserId, 'JOB_TITLE_UPDATED', id, { name: updated.name, before: { name: jobTitle.name, active: jobTitle.active }, after: { name: updated.name, active: updated.active } }); return updated; }
    catch { throw new ConflictException('Não foi possível atualizar o cargo'); }
  }
  private audit(tenantId: string, userId: string, action: string, entityId: string, metadata: { name: string; before?: object; after?: object }) { return this.prisma.auditLog.create({ data: { tenantId, userId, action, entity: 'JOB_TITLE', entityId, metadata } }); }
}
