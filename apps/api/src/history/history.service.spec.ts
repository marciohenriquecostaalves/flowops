import { ForbiddenException } from '@nestjs/common';
import { HistoryService } from './history.service';

describe('HistoryService', () => {
  const prisma = {
    employee: { findFirst: jest.fn() },
    activitySession: { count: jest.fn(), findMany: jest.fn() },
    productionPunch: { count: jest.fn(), findMany: jest.fn() },
  };
  const service = new HistoryService(prisma as any);

  beforeEach(() => jest.clearAllMocks());

  it('scopes an operator to the linked employee', async () => {
    prisma.employee.findFirst.mockResolvedValue({ id: 'employee-a' });
    await expect(service.scopeForUser('tenant-a', 'user-a', ['OPERATOR'])).resolves.toEqual({ employeeId: 'employee-a' });
  });

  it('rejects a foreman without a responsible department', async () => {
    prisma.employee.findFirst.mockResolvedValue({ departmentId: null });
    await expect(service.scopeForUser('tenant-a', 'user-a', ['FOREMAN'])).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns paginated sessions with the requested filters', async () => {
    prisma.activitySession.count.mockResolvedValue(11);
    prisma.activitySession.findMany.mockResolvedValue([]);
    const result = await service.list('tenant-a', { from: '2026-08-01', to: '2026-08-15', page: 2, pageSize: 5 } as any, { departmentId: 'department-a' });

    expect(result.pagination).toEqual({ page: 2, pageSize: 5, total: 11, totalPages: 3 });
    expect(prisma.activitySession.count).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ employee: { departmentId: 'department-a' } }) }));
    expect(prisma.activitySession.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 5, take: 5 }));
  });

  it('rejects an inverted date range', async () => {
    await expect(service.list('tenant-a', { from: '2026-08-20', to: '2026-08-01' } as any)).rejects.toThrow('período informado é inválido');
  });

  it('returns paginated kiosk punches', async () => {
    prisma.productionPunch.count.mockResolvedValue(11);
    prisma.productionPunch.findMany.mockResolvedValue([]);
    const result = await service.punches('tenant-a', { from: '2026-08-01', to: '2026-08-15', page: 2, pageSize: 5 } as any, { departmentId: 'department-a' });

    expect(result.pagination).toEqual({ page: 2, pageSize: 5, total: 11, totalPages: 3 });
    expect(prisma.productionPunch.count).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ employee: { departmentId: 'department-a' } }) }));
    expect(prisma.productionPunch.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 5, take: 5 }));
  });
});
