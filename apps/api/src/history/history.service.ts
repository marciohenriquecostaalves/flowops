import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HistoryQueryDto } from './dto/history-query.dto';

type HistoryScope = { employeeId?: string; departmentId?: string };

@Injectable()
export class HistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async scopeForUser(tenantId: string, userId: string, roles: string[]): Promise<HistoryScope> {
    if (roles.includes('FOREMAN')) {
      const employee = await this.prisma.employee.findFirst({
        where: { tenantId, userId },
        select: { departmentId: true },
      });
      if (!employee?.departmentId) throw new ForbiddenException('Encarregado precisa estar vinculado a um departamento');
      return { departmentId: employee.departmentId };
    }

    if (roles.includes('OPERATOR')) {
      const employee = await this.prisma.employee.findFirst({
        where: { tenantId, userId },
        select: { id: true },
      });
      if (!employee) throw new ForbiddenException('Operador precisa estar vinculado a um colaborador');
      return { employeeId: employee.id };
    }

    return {};
  }

  async list(tenantId: string, query: HistoryQueryDto, scope: HistoryScope = {}) {
    const where = this.buildWhere(tenantId, query, scope);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const [total, sessions] = await Promise.all([
      this.prisma.activitySession.count({ where }),
      this.prisma.activitySession.findMany({
        where,
        select: SESSION_SELECT,
        orderBy: [{ startedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: sessions,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async export(tenantId: string, query: HistoryQueryDto, scope: HistoryScope = {}) {
    const sessions = await this.prisma.activitySession.findMany({
      where: this.buildWhere(tenantId, query, scope),
      select: SESSION_SELECT,
      orderBy: [{ startedAt: 'desc' }, { createdAt: 'desc' }],
      take: 5000,
    });
    return { items: sessions };
  }

  private buildWhere(tenantId: string, query: HistoryQueryDto, scope: HistoryScope): Prisma.ActivitySessionWhereInput {
    const from = startOfDay(query.from);
    const to = endOfDay(query.to);
    if (from && to && from > to) throw new BadRequestException('O período informado é inválido');

    const employeeId = scope.employeeId ?? query.employeeId;
    const departmentId = scope.departmentId ?? query.departmentId;
    const where: Prisma.ActivitySessionWhereInput = {
      tenantId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.activityId ? { activityId: query.activityId } : {}),
      ...(employeeId ? { employeeId } : {}),
      ...(from || to ? { startedAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    };

    if (departmentId || query.shiftId) {
      where.employee = {
        ...(departmentId ? { departmentId } : {}),
        ...(query.shiftId ? { shiftId: query.shiftId } : {}),
      };
    }

    return where;
  }
}

const SESSION_SELECT = {
  id: true,
  status: true,
  startedAt: true,
  pausedAt: true,
  endedAt: true,
  productiveSeconds: true,
  pausedSeconds: true,
  units: true,
  employee: {
    select: {
      id: true,
      name: true,
      employeeCode: true,
      department: { select: { id: true, name: true } },
      shift: { select: { id: true, name: true, startTime: true, endTime: true } },
    },
  },
  activity: { select: { id: true, name: true, code: true } },
} satisfies Prisma.ActivitySessionSelect;

function startOfDay(value?: string) {
  if (!value) return undefined;
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) throw new BadRequestException('Data inicial inválida');
  return date;
}

function endOfDay(value?: string) {
  if (!value) return undefined;
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T23:59:59.999` : value);
  if (Number.isNaN(date.getTime())) throw new BadRequestException('Data final inválida');
  return date;
}
