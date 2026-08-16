import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';

@Injectable()
export class ShiftsService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.shift.findMany({
      where: { tenantId },
      include: { _count: { select: { employees: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async create(tenantId: string, actorUserId: string, dto: CreateShiftDto) {
    try {
      const shift = await this.prisma.shift.create({ data: { tenantId, ...dto } });
      await this.audit(tenantId, actorUserId, 'SHIFT_CREATED', shift.id, { name: shift.name });
      return shift;
    } catch {
      throw new ConflictException('Turno já existe');
    }
  }

  async update(tenantId: string, actorUserId: string, id: string, dto: UpdateShiftDto) {
    const shift = await this.prisma.shift.findFirst({ where: { id, tenantId } });
    if (!shift) throw new NotFoundException('Turno não pertence à empresa');

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
