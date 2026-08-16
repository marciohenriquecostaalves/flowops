import { Test } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthController', () => {
  it('returns healthy status', async () => {
    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: { $queryRaw: jest.fn().mockResolvedValue([{ ok: 1 }]) },
        },
      ],
    }).compile();

    const controller = module.get(HealthController);
    expect(await controller.check()).toMatchObject({ status: 'ok' });
    expect(await controller.live()).toMatchObject({ status: 'ok' });
  });

  it('reports the database as unavailable when readiness fails', async () => {
    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: { $queryRaw: jest.fn().mockRejectedValue(new Error('database offline')) },
        },
      ],
    }).compile();

    await expect(module.get(HealthController).ready()).rejects.toMatchObject({ status: 503 });
  });
});
