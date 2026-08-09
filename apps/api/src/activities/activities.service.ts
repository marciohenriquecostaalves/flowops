import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.activity.findMany({
      where: { tenantId },
      include: { department: true },
      orderBy: { name: 'asc' },
    });
  }
}
