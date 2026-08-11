import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';

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
}
