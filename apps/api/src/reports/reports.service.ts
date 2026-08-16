import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { scopedUnitWhere } from '../auth/unit-scope';

type ReportFilters = { from?: string; to?: string; departmentId?: string; shiftId?: string; employeeId?: string; activityId?: string };
type ReportSession = { units: number; productiveSeconds: number; employee: { id: string; name: string; employeeCode: string; department: { id: string; name: string } | null; shift: { id: string; name: string } | null }; activity: { id: string; name: string; code: string; targetPerHour: Prisma.Decimal | null } };

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async departmentForUser(tenantId: string, userId: string) {
    const employee = await this.prisma.employee.findFirst({ where: { tenantId, userId }, select: { departmentId: true } });
    if (!employee?.departmentId) throw new ForbiddenException('Encarregado precisa estar vinculado a um departamento');
    return employee.departmentId;
  }

  async productivity(tenantId: string, filters: ReportFilters, roles: string[] = [], unitIds: string[] = []) {
    const where: Prisma.ActivitySessionWhereInput = { ...scopedUnitWhere(tenantId, roles, unitIds), status: 'COMPLETED' };
    const from = startOfDay(filters.from);
    const to = endOfDay(filters.to);
    if (from || to) where.endedAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
    if (filters.employeeId) where.employeeId = filters.employeeId;
    if (filters.activityId) where.activityId = filters.activityId;
    if (filters.departmentId || filters.shiftId) where.employee = { ...(filters.departmentId ? { departmentId: filters.departmentId } : {}), ...(filters.shiftId ? { shiftId: filters.shiftId } : {}) };

    const sessions = await this.prisma.activitySession.findMany({
      where,
      include: { employee: { include: { department: true, shift: true } }, activity: true },
      orderBy: { endedAt: 'desc' },
      take: 5000,
    });

    const typed = sessions as ReportSession[];
    return {
      summary: summarize(typed),
      byEmployee: group(typed, (session) => ({ id: session.employee.id, label: `${session.employee.employeeCode} · ${session.employee.name}`, detail: session.employee.department?.name ?? 'Sem departamento' })),
      byDepartment: group(typed, (session) => ({ id: session.employee.department?.id ?? 'none', label: session.employee.department?.name ?? 'Sem departamento', detail: '' })),
      byActivity: group(typed, (session) => ({ id: session.activity.id, label: `${session.activity.code} · ${session.activity.name}`, detail: '' })),
    };
  }
}

function startOfDay(value?: string) {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) throw new BadRequestException('Data inicial inválida');
  return date;
}

function endOfDay(value?: string) {
  if (!value) return undefined;
  const date = new Date(`${value}T23:59:59.999`);
  if (Number.isNaN(date.getTime())) throw new BadRequestException('Data final inválida');
  return date;
}

function summarize(sessions: ReportSession[]) {
  let units = 0; let productiveSeconds = 0; let targetUnits = 0; let unitsWithTarget = 0;
  for (const session of sessions) {
    units += session.units;
    productiveSeconds += session.productiveSeconds;
    if (session.activity.targetPerHour) {
      targetUnits += Number(session.activity.targetPerHour) * (session.productiveSeconds / 3600);
      unitsWithTarget += session.units;
    }
  }
  return { sessions: sessions.length, units, productiveSeconds, productivity: productiveSeconds >= 15 * 60 ? (units / productiveSeconds) * 3600 : null, targetUnits, unitsWithTarget, achievementPercent: targetUnits ? (unitsWithTarget / targetUnits) * 100 : null };
}

function group(sessions: ReportSession[], key: (session: ReportSession) => { id: string; label: string; detail: string }) {
  const buckets = new Map<string, { id: string; label: string; detail: string; sessions: ReportSession[] }>();
  for (const session of sessions) {
    const item = key(session);
    const bucket = buckets.get(item.id) ?? { ...item, sessions: [] };
    bucket.sessions.push(session);
    buckets.set(item.id, bucket);
  }
  return Array.from(buckets.values()).map((bucket) => ({ ...bucket, ...summarize(bucket.sessions), sessions: undefined })).sort((a, b) => (b.productivity ?? -1) - (a.productivity ?? -1));
}
