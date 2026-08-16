import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    return this.ready();
  }

  @Get('live')
  live() {
    return {
      status: 'ok',
      service: 'flowops-api',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        service: 'flowops-api',
        dependencies: { database: 'unavailable' },
      });
    }
    return {
      status: 'ok',
      service: 'flowops-api',
      timestamp: new Date().toISOString(),
      dependencies: { database: 'ok' },
    };
  }
}
