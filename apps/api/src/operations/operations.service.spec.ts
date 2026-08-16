import { BadRequestException } from '@nestjs/common';
import { OperationsService } from './operations.service';

describe('OperationsService', () => {
  const prisma = {
    activitySession: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    auditLog: { create: jest.fn() },
  };
  const service = new OperationsService(prisma as any);

  const runningSession = () => ({
    id: 'session-a',
    status: 'RUNNING',
    units: 4,
    productiveSeconds: 20,
    pausedSeconds: 0,
    startedAt: new Date(Date.now() - 30_000),
    pausedAt: null,
    endedAt: null,
    employee: { name: 'Ana Martins', employeeCode: 'EMP-002' },
    activity: { name: 'Separação', code: 'SEPARACAO' },
  });

  beforeEach(() => jest.clearAllMocks());

  it('blocks unit changes after a session is completed', async () => {
    prisma.activitySession.findFirst.mockResolvedValue({ ...runningSession(), status: 'COMPLETED' });

    await expect(service.setUnits('tenant-a', 'user-a', 'session-a', { units: 10 } as any))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.activitySession.update).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('records before and after snapshots when pausing a session', async () => {
    const before = runningSession();
    const after = { ...before, status: 'PAUSED', pausedAt: new Date(), productiveSeconds: 30 };
    prisma.activitySession.findFirst.mockResolvedValue(before);
    prisma.activitySession.update.mockResolvedValue(after);
    prisma.auditLog.create.mockResolvedValue({ id: 'audit-a' });

    await service.pause('tenant-a', 'user-a', 'session-a');

    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: 'SESSION_PAUSED',
        userId: 'user-a',
        metadata: expect.objectContaining({
          before: expect.objectContaining({ status: 'RUNNING', units: 4 }),
          after: expect.objectContaining({ status: 'PAUSED', units: 4 }),
        }),
      }),
    }));
  });
});
