import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.department.findMany({
      where: { tenantId },
      include: { _count: { select: { employees: true, activities: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async create(tenantId: string, dto: CreateDepartmentDto) {
    try {
      return await this.prisma.department.create({
        data: { tenantId, name: dto.name },
      });
    } catch {
      throw new ConflictException('Departamento já existe');
    }
  }

  async update(tenantId: string, id: string, dto: UpdateDepartmentDto) {
    const department = await this.prisma.department.findFirst({ where: { id, tenantId } });
    if (!department) throw new NotFoundException('Departamento não pertence à empresa');

    try {
      return await this.prisma.department.update({ where: { id }, data: dto });
    } catch {
      throw new ConflictException('Não foi possível atualizar o departamento');
    }
  }

  async remove(tenantId: string, id: string) {
    const department = await this.prisma.department.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { employees: true, activities: true } } },
    });
    if (!department) throw new NotFoundException('Departamento não pertence à empresa');
    if (department._count.employees || department._count.activities) {
      throw new ConflictException('Não é possível excluir um departamento com vínculos ativos');
    }
    await this.prisma.department.delete({ where: { id } });
    return { deleted: true };
  }
}
