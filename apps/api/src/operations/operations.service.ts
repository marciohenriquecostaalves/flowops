import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StartSessionDto } from './dto/start-session.dto';
import { UnitsDto } from './dto/units.dto';

@Injectable()
export class OperationsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertSession(tenantId: string, id: string) {
    const session = await this.prisma.activitySession.findFirst({
      where: { id, tenantId },
      include: { employee: true, activity: true },
    });
    if (!session) throw new NotFoundException('Sessão não encontrada');
    return session;
  }

  async assertOperatorStart(tenantId: string, userId: string, employeeId: string) {
    const employee = await this.prisma.employee.findFirst({ where: { tenantId, userId } });
    if (!employee || employee.id !== employeeId) throw new ForbiddenException('Operador só pode iniciar a própria sessão');
  }

  async assertOperatorSession(tenantId: string, userId: string, sessionId: string) {
    const session = await this.prisma.activitySession.findFirst({ where: { id: sessionId, tenantId }, include: { employee: true } });
    if (!session || session.employee.userId !== userId) throw new ForbiddenException('Operador só pode alterar a própria sessão');
  }

  async start(tenantId: string, actorUserId: string, dto: StartSessionDto) {
    const [employee, activity, running] = await Promise.all([
      this.prisma.employee.findFirst({ where: { id: dto.employeeId, tenantId, status: 'ACTIVE' } }),
      this.prisma.activity.findFirst({ where: { id: dto.activityId, tenantId, status: 'ACTIVE' } }),
      this.prisma.activitySession.findFirst({
        where: { tenantId, employeeId: dto.employeeId, status: { in: ['RUNNING', 'PAUSED'] } },
      }),
    ]);

    if (!employee) throw new NotFoundException('Colaborador ativo não encontrado');
    if (!activity) throw new NotFoundException('Atividade ativa não encontrada');
    if (running) throw new ConflictException('Colaborador já possui uma sessão aberta');

    const session = await this.prisma.activitySession.create({
      data: {
        tenantId,
        employeeId: dto.employeeId,
        activityId: dto.activityId,
        status: 'RUNNING',
        startedAt: new Date(),
      },
      include: { employee: true, activity: true },
    });
    await this.audit(tenantId, actorUserId, 'SESSION_STARTED', session.id, session);
    return session;
  }

  async pause(tenantId: string, actorUserId: string, id: string) {
    const session = await this.assertSession(tenantId, id);
    if (session.status !== 'RUNNING') {
      throw new BadRequestException('Somente sessões em execução podem ser pausadas');
    }

    const now = new Date();
    const productive = Math.max(0, Math.floor((now.getTime() - session.startedAt.getTime()) / 1000) - session.pausedSeconds);

    const updated = await this.prisma.activitySession.update({
      where: { id },
      data: {
        status: 'PAUSED',
        pausedAt: now,
        productiveSeconds: productive,
      },
      include: { employee: true, activity: true },
    });
    await this.audit(tenantId, actorUserId, 'SESSION_PAUSED', id, updated);
    return updated;
  }

  async resume(tenantId: string, actorUserId: string, id: string) {
    const session = await this.assertSession(tenantId, id);
    if (session.status !== 'PAUSED' || !session.pausedAt) {
      throw new BadRequestException('Somente sessões pausadas podem ser retomadas');
    }

    const now = new Date();
    const paused = Math.max(0, Math.floor((now.getTime() - session.pausedAt.getTime()) / 1000));

    const updated = await this.prisma.activitySession.update({
      where: { id },
      data: {
        status: 'RUNNING',
        pausedAt: null,
        pausedSeconds: session.pausedSeconds + paused,
      },
      include: { employee: true, activity: true },
    });
    await this.audit(tenantId, actorUserId, 'SESSION_RESUMED', id, updated);
    return updated;
  }

  async finish(tenantId: string, actorUserId: string, id: string) {
    const session = await this.assertSession(tenantId, id);
    if (!['RUNNING', 'PAUSED'].includes(session.status)) {
      throw new BadRequestException('Sessão já encerrada');
    }

    const now = new Date();
    let pausedSeconds = session.pausedSeconds;

    if (session.status === 'PAUSED' && session.pausedAt) {
      pausedSeconds += Math.max(0, Math.floor((now.getTime() - session.pausedAt.getTime()) / 1000));
    }

    const productive = Math.max(
      0,
      Math.floor((now.getTime() - session.startedAt.getTime()) / 1000) - pausedSeconds,
    );

    const updated = await this.prisma.activitySession.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        endedAt: now,
        pausedAt: null,
        pausedSeconds,
        productiveSeconds: productive,
      },
      include: { employee: true, activity: true },
    });
    await this.audit(tenantId, actorUserId, 'SESSION_FINISHED', id, updated);
    return updated;
  }

  async setUnits(tenantId: string, actorUserId: string, id: string, dto: UnitsDto) {
    await this.assertSession(tenantId, id);
    const updated = await this.prisma.activitySession.update({
      where: { id },
      data: { units: dto.units },
      include: { employee: true, activity: true },
    });
    await this.audit(tenantId, actorUserId, 'SESSION_UNITS_UPDATED', id, updated);
    return updated;
  }

  async departmentForUser(tenantId: string, userId: string) {
    const employee = await this.prisma.employee.findFirst({ where: { tenantId, userId }, select: { departmentId: true } });
    if (!employee?.departmentId) throw new ForbiddenException('Encarregado precisa estar vinculado a um departamento');
    return employee.departmentId;
  }

  active(tenantId: string, userId?: string, departmentId?: string) {
    return this.prisma.activitySession.findMany({
      where: { tenantId, status: { in: ['RUNNING', 'PAUSED'] }, ...((userId || departmentId) ? { employee: { ...(userId ? { userId } : {}), ...(departmentId ? { departmentId } : {}) } } : {}) },
      include: { employee: true, activity: true },
      orderBy: { startedAt: 'asc' },
    });
  }

  async productivity(tenantId: string, userId?: string, departmentId?: string) {
    const sessions = await this.prisma.activitySession.findMany({
      where: { tenantId, status: 'COMPLETED', ...((userId || departmentId) ? { employee: { ...(userId ? { userId } : {}), ...(departmentId ? { departmentId } : {}) } } : {}) },
      include: { employee: true, activity: true },
      orderBy: { endedAt: 'desc' },
      take: 1000,
    });

    const byEmployee = new Map<string, {
      employeeId: string;
      employee: string;
      units: number;
      productiveSeconds: number;
      productivity: number | null;
    }>();

    for (const s of sessions) {
      const current = byEmployee.get(s.employeeId) ?? {
        employeeId: s.employeeId,
        employee: s.employee.name,
        units: 0,
        productiveSeconds: 0,
        productivity: null,
      };

      current.units += s.units;
      current.productiveSeconds += s.productiveSeconds;
      current.productivity = current.productiveSeconds >= 15 * 60
        ? (current.units / current.productiveSeconds) * 3600
        : null;

      byEmployee.set(s.employeeId, current);
    }

    return Array.from(byEmployee.values()).sort((a, b) => (b.productivity ?? -1) - (a.productivity ?? -1));
  }

  private audit(tenantId: string, userId: string, action: string, entityId: string, session: { employee: { name: string; employeeCode: string }; activity: { name: string; code: string }; units: number }) {
    return this.prisma.auditLog.create({
      data: { tenantId, userId, action, entity: 'OPERATION', entityId, metadata: { employee: session.employee.name, employeeCode: session.employee.employeeCode, activity: session.activity.name, activityCode: session.activity.code, units: session.units } },
    });
  }
}
