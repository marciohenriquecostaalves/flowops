import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

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

  async create(tenantId: string, dto: CreateActivityDto) {
    if (dto.departmentId) {
      const department = await this.prisma.department.findFirst({
        where: { id: dto.departmentId, tenantId },
      });
      if (!department) throw new NotFoundException('Departamento não encontrado');
    }

    try {
      return await this.prisma.activity.create({
        data: {
          tenantId,
          name: dto.name,
          code: dto.code,
          departmentId: dto.departmentId,
          targetPerHour: dto.targetPerHour,
        },
      });
    } catch {
      throw new ConflictException('Código de atividade já existe');
    }
  }

  async update(tenantId: string, id: string, dto: UpdateActivityDto) {
    const activity = await this.prisma.activity.findFirst({ where: { id, tenantId } });
    if (!activity) throw new NotFoundException('Atividade não encontrada');

    return this.prisma.activity.update({
      where: { id },
      data: {
        name: dto.name,
        status: dto.active === undefined ? undefined : dto.active ? 'ACTIVE' : 'INACTIVE',
        targetPerHour: dto.targetPerHour,
        departmentId: dto.departmentId,
      },
    });
  }
}
