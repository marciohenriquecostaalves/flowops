import {
  BadRequestException,
  ConflictException,
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

  async start(tenantId: string, dto: StartSessionDto) {
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

    return this.prisma.activitySession.create({
      data: {
        tenantId,
        employeeId: dto.employeeId,
        activityId: dto.activityId,
        status: 'RUNNING',
        startedAt: new Date(),
      },
      include: { employee: true, activity: true },
    });
  }

  async pause(tenantId: string, id: string) {
    const session = await this.assertSession(tenantId, id);
    if (session.status !== 'RUNNING') {
      throw new BadRequestException('Somente sessões em execução podem ser pausadas');
    }

    const now = new Date();
    const productive = Math.max(0, Math.floor((now.getTime() - session.startedAt.getTime()) / 1000) - session.pausedSeconds);

    return this.prisma.activitySession.update({
      where: { id },
      data: {
        status: 'PAUSED',
        pausedAt: now,
        productiveSeconds: productive,
      },
      include: { employee: true, activity: true },
    });
  }

  async resume(tenantId: string, id: string) {
    const session = await this.assertSession(tenantId, id);
    if (session.status !== 'PAUSED' || !session.pausedAt) {
      throw new BadRequestException('Somente sessões pausadas podem ser retomadas');
    }

    const now = new Date();
    const paused = Math.max(0, Math.floor((now.getTime() - session.pausedAt.getTime()) / 1000));

    return this.prisma.activitySession.update({
      where: { id },
      data: {
        status: 'RUNNING',
        pausedAt: null,
        pausedSeconds: session.pausedSeconds + paused,
      },
      include: { employee: true, activity: true },
    });
  }

  async finish(tenantId: string, id: string) {
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

    return this.prisma.activitySession.update({
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
  }

  async setUnits(tenantId: string, id: string, dto: UnitsDto) {
    await this.assertSession(tenantId, id);
    return this.prisma.activitySession.update({
      where: { id },
      data: { units: dto.units },
      include: { employee: true, activity: true },
    });
  }

  active(tenantId: string) {
    return this.prisma.activitySession.findMany({
      where: { tenantId, status: { in: ['RUNNING', 'PAUSED'] } },
      include: { employee: true, activity: true },
      orderBy: { startedAt: 'asc' },
    });
  }

  async productivity(tenantId: string) {
    const sessions = await this.prisma.activitySession.findMany({
      where: { tenantId, status: 'COMPLETED' },
      include: { employee: true, activity: true },
      orderBy: { endedAt: 'desc' },
      take: 1000,
    });

    const byEmployee = new Map<string, {
      employeeId: string;
      employee: string;
      units: number;
      productiveSeconds: number;
      productivity: number;
    }>();

    for (const s of sessions) {
      const current = byEmployee.get(s.employeeId) ?? {
        employeeId: s.employeeId,
        employee: s.employee.name,
        units: 0,
        productiveSeconds: 0,
        productivity: 0,
      };

      current.units += s.units;
      current.productiveSeconds += s.productiveSeconds;
      current.productivity = current.productiveSeconds
        ? (current.units / current.productiveSeconds) * 3600
        : 0;

      byEmployee.set(s.employeeId, current);
    }

    return Array.from(byEmployee.values()).sort((a, b) => b.productivity - a.productivity);
  }
}
