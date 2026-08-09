import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.employee.findMany({
      where: { tenantId },
      include: { department: true },
      orderBy: { name: 'asc' },
    });
  }

  async create(tenantId: string, dto: CreateEmployeeDto) {
    try {
      return await this.prisma.employee.create({
        data: { tenantId, ...dto },
      });
    } catch {
      throw new ConflictException('Código de colaborador já existe');
    }
  }
}
