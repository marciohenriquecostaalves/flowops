import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShiftDto } from './dto/create-shift.dto';

@Injectable()
export class ShiftsService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.shift.findMany({
      where: { tenantId },
      include: { _count: { select: { employees: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async create(tenantId: string, dto: CreateShiftDto) {
    try {
      return await this.prisma.shift.create({ data: { tenantId, ...dto } });
    } catch {
      throw new ConflictException('Turno já existe');
    }
  }
}
