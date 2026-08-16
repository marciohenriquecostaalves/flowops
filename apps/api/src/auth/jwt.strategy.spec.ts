import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const prisma = { user: { findFirst: jest.fn() } };
  let strategy: JwtStrategy;

  beforeEach(() => {
    process.env.JWT_ACCESS_SECRET = 'test-access-secret';
    jest.clearAllMocks();
    strategy = new JwtStrategy(prisma as any);
  });

  it('rejects an inactive or deleted user', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(strategy.validate({ sub: 'user-a', tenantId: 'tenant-a', roles: ['ADMIN'] }))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('loads current roles and access areas on every request', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'user-a',
      accessAreas: ['dashboard', 'reports'],
      roles: [{ role: { name: 'FOREMAN' } }],
    });
    await expect(strategy.validate({ sub: 'user-a', tenantId: 'tenant-a', roles: ['ADMIN'], accessAreas: ['users'] }))
      .resolves.toEqual({
        sub: 'user-a',
        tenantId: 'tenant-a',
        roles: ['FOREMAN'],
        accessAreas: ['dashboard', 'reports'],
      });
  });
});
