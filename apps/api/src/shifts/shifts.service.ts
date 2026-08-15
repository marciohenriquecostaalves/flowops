import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';

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

  async update(tenantId: string, id: string, dto: UpdateShiftDto) {
    const shift = await this.prisma.shift.findFirst({ where: { id, tenantId } });
    if (!shift) throw new NotFoundException('Turno não pertence à empresa');

    try {
      return await this.prisma.shift.update({ where: { id }, data: dto });
    } catch {
      throw new ConflictException('Não foi possível atualizar o turno');
    }
  }
}
