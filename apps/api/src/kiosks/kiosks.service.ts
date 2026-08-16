import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, ProductionPunchType } from '@prisma/client';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateKioskDto } from './dto/create-kiosk.dto';
import { UpdateKioskDto } from './dto/update-kiosk.dto';

const nextPunchByType: Record<ProductionPunchType, ProductionPunchType> = {
  START: 'PAUSE',
  PAUSE: 'RESUME',
  RESUME: 'FINISH',
  FINISH: 'START',
};

const DEFAULT_PUNCH_DEBOUNCE_SECONDS = 5;

@Injectable()
export class KiosksService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string) {
    return this.prisma.kioskDevice.findMany({
      where: { tenantId },
      select: {
        id: true,
        tenantId: true,
        activityId: true,
        unitId: true,
        name: true,
        code: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        activity: { select: { id: true, name: true, code: true } },
        unit: { select: { id: true, code: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async create(tenantId: string, actorUserId: string, dto: CreateKioskDto) {
    const activity = await this.prisma.activity.findFirst({
      where: { id: dto.activityId, tenantId, status: 'ACTIVE' },
      select: { id: true, name: true, code: true, unitId: true },
    });
    if (!activity) throw new NotFoundException('Atividade ativa não encontrada');

    const code = (dto.code ? dto.code.trim().toUpperCase() : await this.nextCode(tenantId));
    const existing = await this.prisma.kioskDevice.findFirst({ where: { tenantId, code }, select: { id: true } });
    if (existing) throw new ConflictException('Código de quiosque já existe');

    const token = randomBytes(32).toString('base64url');
    const kiosk = await this.prisma.kioskDevice.create({
      data: {
        tenantId,
        unitId: activity.unitId,
        activityId: activity.id,
        name: dto.name.trim(),
        code,
        secretHash: hashToken(token),
      },
      include: { activity: { select: { id: true, name: true, code: true } }, unit: { select: { id: true, code: true, name: true } } },
    });
    await this.audit(tenantId, actorUserId, 'KIOSK_CREATED', kiosk.id, { name: kiosk.name, code: kiosk.code, activity: activity.name });
    return {
      id: kiosk.id,
      tenantId: kiosk.tenantId,
      activityId: kiosk.activityId,
      name: kiosk.name,
      code: kiosk.code,
      active: kiosk.active,
      createdAt: kiosk.createdAt,
      updatedAt: kiosk.updatedAt,
      activity: kiosk.activity,
      unit: kiosk.unit,
      token,
    };
  }

  async update(tenantId: string, actorUserId: string, id: string, dto: UpdateKioskDto) {
    const kiosk = await this.prisma.kioskDevice.findFirst({ where: { id, tenantId } });
    if (!kiosk) throw new NotFoundException('Quiosque não encontrado');

    let activityUnitId: string | null = kiosk.unitId;
    if (dto.activityId) {
      const activity = await this.prisma.activity.findFirst({ where: { id: dto.activityId, tenantId, status: 'ACTIVE' }, select: { id: true, unitId: true } });
      if (!activity) throw new NotFoundException('Atividade ativa não encontrada');
      activityUnitId = activity.unitId;
    }

    const updated = await this.prisma.kioskDevice.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.activityId !== undefined ? { activityId: dto.activityId, unitId: activityUnitId } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
      include: { activity: { select: { id: true, name: true, code: true } }, unit: { select: { id: true, code: true, name: true } } },
    });
    await this.audit(tenantId, actorUserId, 'KIOSK_UPDATED', id, { name: updated.name, code: updated.code, active: updated.active, activity: updated.activity.name });
    return {
      id: updated.id,
      tenantId: updated.tenantId,
      activityId: updated.activityId,
      name: updated.name,
      code: updated.code,
      active: updated.active,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      activity: updated.activity,
      unit: updated.unit,
    };
  }

  async rotateToken(tenantId: string, actorUserId: string, id: string) {
    const kiosk = await this.prisma.kioskDevice.findFirst({
      where: { id, tenantId },
      include: { activity: { select: { id: true, name: true, code: true } }, unit: { select: { id: true, code: true, name: true } } },
    });
    if (!kiosk) throw new NotFoundException('Quiosque não encontrado');

    const token = randomBytes(32).toString('base64url');
    const updated = await this.prisma.kioskDevice.update({
      where: { id },
      data: { secretHash: hashToken(token) },
      include: { activity: { select: { id: true, name: true, code: true } } },
    });
    await this.audit(tenantId, actorUserId, 'KIOSK_TOKEN_ROTATED', id, {
      name: updated.name,
      code: updated.code,
      activity: kiosk.activity.name,
    });
    return {
      id: updated.id,
      tenantId: updated.tenantId,
      activityId: updated.activityId,
      name: updated.name,
      code: updated.code,
      active: updated.active,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      activity: updated.activity,
      token,
    };
  }

  async punch(kioskCodeHeader: string | undefined, tokenHeader: string | undefined, badgeCode: string) {
    const kioskCode = kioskCodeHeader?.trim().toUpperCase();
    const token = tokenHeader?.trim();
    if (!kioskCode || !token) throw new UnauthorizedException('Quiosque não autenticado');

    const candidates = await this.prisma.kioskDevice.findMany({
      where: { code: kioskCode, active: true },
      include: { activity: true },
    });
    const kiosk = candidates.find((item) => verifyToken(token, item.secretHash));
    if (!kiosk) throw new UnauthorizedException('Quiosque inválido ou desativado');

    const normalizedBadge = badgeCode.trim().toUpperCase();
    const employee = await this.prisma.employee.findFirst({
      where: { tenantId: kiosk.tenantId, unitId: kiosk.unitId ?? '__no_unit__', badgeCode: normalizedBadge, status: 'ACTIVE' },
      include: { department: true, shift: true },
    });
    if (!employee) throw new NotFoundException('Crachá não encontrado ou colaborador inativo');

    try {
      return await this.prisma.$transaction(async (tx) => {
        const now = new Date();
        const lockKey = `${kiosk.tenantId}:${employee.id}`;
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;

        const latestPunch = await tx.productionPunch.findFirst({
          where: { tenantId: kiosk.tenantId, employeeId: employee.id },
          orderBy: { recordedAt: 'desc' },
          select: { recordedAt: true },
        });
        const debounceSeconds = punchDebounceSeconds();
        if (latestPunch && now.getTime() - latestPunch.recordedAt.getTime() < debounceSeconds * 1000) {
          throw new ConflictException(`Batida já registrada. Aguarde ${debounceSeconds} segundos.`);
        }

        const session = await tx.activitySession.findFirst({
          where: { tenantId: kiosk.tenantId, employeeId: employee.id, status: { in: ['RUNNING', 'PAUSED'] } },
          orderBy: { startedAt: 'desc' },
          include: { activity: true },
        });
        const punchCount = session
          ? await tx.productionPunch.count({ where: { sessionId: session.id } })
          : 0;

        let type: ProductionPunchType;
        let sequence: number;
        let updatedSession;
        if (!session) {
          type = 'START';
          sequence = 1;
          updatedSession = await tx.activitySession.create({
            data: {
              tenantId: kiosk.tenantId,
              unitId: kiosk.unitId,
              employeeId: employee.id,
              activityId: kiosk.activityId,
              status: 'RUNNING',
              startedAt: now,
            },
            include: { activity: true },
          });
        } else {
          if (session.activityId !== kiosk.activityId) {
            throw new ConflictException(`O colaborador possui uma sessão aberta em ${session.activity.name}`);
          }
          if (punchCount === 0) throw new ConflictException('A sessão aberta foi iniciada fora do quiosque');

          sequence = punchCount + 1;
          if (sequence === 2 && session.status === 'RUNNING') {
            type = 'PAUSE';
            const productive = Math.max(0, Math.floor((now.getTime() - session.startedAt.getTime()) / 1000) - session.pausedSeconds);
            updatedSession = await tx.activitySession.update({ where: { id: session.id }, data: { status: 'PAUSED', pausedAt: now, productiveSeconds: productive }, include: { activity: true } });
          } else if (sequence === 3 && session.status === 'PAUSED' && session.pausedAt) {
            type = 'RESUME';
            const paused = Math.max(0, Math.floor((now.getTime() - session.pausedAt.getTime()) / 1000));
            updatedSession = await tx.activitySession.update({ where: { id: session.id }, data: { status: 'RUNNING', pausedAt: null, pausedSeconds: session.pausedSeconds + paused }, include: { activity: true } });
          } else if (sequence === 4 && session.status === 'RUNNING') {
            type = 'FINISH';
            const productive = Math.max(0, Math.floor((now.getTime() - session.startedAt.getTime()) / 1000) - session.pausedSeconds);
            updatedSession = await tx.activitySession.update({ where: { id: session.id }, data: { status: 'COMPLETED', endedAt: now, pausedAt: null, productiveSeconds: productive }, include: { activity: true } });
          } else {
            throw new ConflictException('A próxima batida não corresponde ao estado atual da produção');
          }
        }

        const punch = await tx.productionPunch.create({
          data: {
            tenantId: kiosk.tenantId,
            unitId: kiosk.unitId,
            employeeId: employee.id,
            kioskDeviceId: kiosk.id,
            activityId: kiosk.activityId,
            sessionId: updatedSession.id,
            type,
            sequence,
            recordedAt: now,
          },
        });
        await tx.auditLog.create({
          data: {
            tenantId: kiosk.tenantId,
            unitId: kiosk.unitId,
            action: `PRODUCTION_PUNCH_${type}`,
            entity: 'PRODUCTION_PUNCH',
            entityId: punch.id,
            metadata: { source: 'KIOSK', kioskCode: kiosk.code, kioskName: kiosk.name, employee: employee.name, employeeCode: employee.employeeCode, badgeCode: normalizedBadge, activity: kiosk.activity.name, sequence, sessionId: updatedSession.id },
          },
        });

        return {
          type,
          sequence,
          nextPunch: nextPunchByType[type],
          recordedAt: punch.recordedAt,
          sessionId: updatedSession.id,
          employee: { id: employee.id, name: employee.name, employeeCode: employee.employeeCode, photoData: employee.photoData },
          activity: { id: kiosk.activity.id, name: kiosk.activity.name, code: kiosk.activity.code },
        };
      });
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException('A batida já foi registrada. Aguarde alguns segundos.');
      throw error;
    }
  }

  private async nextCode(tenantId: string) {
    const devices = await this.prisma.kioskDevice.findMany({ where: { tenantId }, select: { code: true } });
    const max = devices.reduce((highest, item) => Math.max(highest, Number(item.code.match(/KIOSK-(\d+)/i)?.[1] ?? 0)), 0);
    return `KIOSK-${String(max + 1).padStart(3, '0')}`;
  }

  private audit(tenantId: string, userId: string, action: string, entityId: string, metadata: Prisma.InputJsonValue) {
    return this.prisma.auditLog.create({ data: { tenantId, userId, action, entity: 'KIOSK', entityId, metadata } });
  }
}

function punchDebounceSeconds() {
  const configured = Number(process.env.KIOSK_PUNCH_DEBOUNCE_SECONDS ?? DEFAULT_PUNCH_DEBOUNCE_SECONDS);
  return Number.isInteger(configured) && configured >= 0 ? configured : DEFAULT_PUNCH_DEBOUNCE_SECONDS;
}

function hashToken(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function verifyToken(value: string, storedHash: string) {
  const current = Buffer.from(hashToken(value));
  const stored = Buffer.from(storedHash);
  return current.length === stored.length && timingSafeEqual(current, stored);
}
