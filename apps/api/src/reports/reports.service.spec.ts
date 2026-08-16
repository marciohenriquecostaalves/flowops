import { ForbiddenException } from '@nestjs/common';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  const prisma = {
    employee: { findFirst: jest.fn() },
    activitySession: { findMany: jest.fn() },
  };
  const service = new ReportsService(prisma as any);

  beforeEach(() => jest.clearAllMocks());

  it('resolves the responsible department for a user', async () => {
    prisma.employee.findFirst.mockResolvedValue({ departmentId: 'department-a' });
    await expect(service.departmentForUser('tenant-a', 'user-a')).resolves.toBe('department-a');
    expect(prisma.employee.findFirst).toHaveBeenCalledWith({ where: { tenantId: 'tenant-a', userId: 'user-a' }, select: { departmentId: true } });
  });

  it('rejects a user without a department', async () => {
    prisma.employee.findFirst.mockResolvedValue({ departmentId: null });
    await expect(service.departmentForUser('tenant-a', 'user-a')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('keeps the department filter in the productivity query', async () => {
    prisma.activitySession.findMany.mockResolvedValue([]);
    await service.productivity('tenant-a', { departmentId: 'department-a' });
    expect(prisma.activitySession.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ employee: { departmentId: 'department-a' } }) }));
  });
});
