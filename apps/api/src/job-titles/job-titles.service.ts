import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobTitleDto } from './dto/create-job-title.dto';
import { UpdateJobTitleDto } from './dto/update-job-title.dto';

@Injectable()
export class JobTitlesService {
  constructor(private readonly prisma: PrismaService) {}
  list(tenantId: string) { return this.prisma.jobTitle.findMany({ where: { tenantId }, include: { _count: { select: { employees: true } } }, orderBy: { name: 'asc' } }); }
  async create(tenantId: string, actorUserId: string, dto: CreateJobTitleDto) {
    try { const jobTitle = await this.prisma.jobTitle.create({ data: { tenantId, name: dto.name } }); await this.audit(tenantId, actorUserId, 'JOB_TITLE_CREATED', jobTitle.id, { name: jobTitle.name }); return jobTitle; }
    catch { throw new ConflictException('Cargo já existe'); }
  }
  async update(tenantId: string, actorUserId: string, id: string, dto: UpdateJobTitleDto) {
    const jobTitle = await this.prisma.jobTitle.findFirst({ where: { id, tenantId } });
    if (!jobTitle) throw new NotFoundException('Cargo não pertence à empresa');
    try { const updated = await this.prisma.jobTitle.update({ where: { id }, data: dto }); await this.audit(tenantId, actorUserId, 'JOB_TITLE_UPDATED', id, { name: updated.name, before: { name: jobTitle.name, active: jobTitle.active }, after: { name: updated.name, active: updated.active } }); return updated; }
    catch { throw new ConflictException('Não foi possível atualizar o cargo'); }
  }
  private audit(tenantId: string, userId: string, action: string, entityId: string, metadata: { name: string; before?: object; after?: object }) { return this.prisma.auditLog.create({ data: { tenantId, userId, action, entity: 'JOB_TITLE', entityId, metadata } }); }
}
