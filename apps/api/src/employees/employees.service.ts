import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.employee.findMany({
      where: { tenantId },
      include: { department: true, shift: true },
      orderBy: { name: 'asc' },
    });
  }

  async create(tenantId: string, dto: CreateEmployeeDto, photoData?: string) {
    const [department, shift] = await Promise.all([
      dto.departmentId
        ? this.prisma.department.findFirst({ where: { id: dto.departmentId, tenantId } })
        : null,
      dto.shiftId
        ? this.prisma.shift.findFirst({ where: { id: dto.shiftId, tenantId } })
        : null,
    ]);

    if (dto.departmentId && !department) {
      throw new NotFoundException('Departamento não pertence à empresa');
    }
    if (dto.shiftId && !shift) {
      throw new NotFoundException('Turno não pertence à empresa');
    }

    try {
      return await this.prisma.employee.create({
        data: {
          tenantId,
          employeeCode: dto.employeeCode,
          name: dto.name,
          email: dto.email,
          jobTitle: dto.jobTitle,
          photoData,
          departmentId: dto.departmentId,
          shiftId: dto.shiftId,
        },
        include: { department: true, shift: true },
      });
    } catch {
      throw new ConflictException('Código de colaborador já existe');
    }
  }

  async update(tenantId: string, id: string, dto: UpdateEmployeeDto, photoData?: string) {
    const employee = await this.prisma.employee.findFirst({ where: { id, tenantId } });
    if (!employee) throw new NotFoundException('Colaborador não encontrado');

    if (dto.departmentId) {
      const department = await this.prisma.department.findFirst({
        where: { id: dto.departmentId, tenantId },
      });
      if (!department) throw new NotFoundException('Departamento não pertence à empresa');
    }

    if (dto.shiftId) {
      const shift = await this.prisma.shift.findFirst({
        where: { id: dto.shiftId, tenantId },
      });
      if (!shift) throw new NotFoundException('Turno não pertence à empresa');
    }

    const data = {
      ...dto,
      ...(dto.departmentId === '' ? { departmentId: null } : {}),
      ...(dto.shiftId === '' ? { shiftId: null } : {}),
      ...(photoData ? { photoData } : {}),
    };

    return this.prisma.employee.update({
      where: { id },
      data,
      include: { department: true, shift: true },
    });
  }
}
