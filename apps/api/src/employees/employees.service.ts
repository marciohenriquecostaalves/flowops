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
      include: { department: true, shift: true, jobTitleRef: true },
      orderBy: { name: 'asc' },
    });
  }

  async create(tenantId: string, actorUserId: string, dto: CreateEmployeeDto, photoData?: string) {
    const [department, shift, jobTitle] = await Promise.all([
      dto.departmentId
        ? this.prisma.department.findFirst({ where: { id: dto.departmentId, tenantId } })
        : null,
      dto.shiftId
        ? this.prisma.shift.findFirst({ where: { id: dto.shiftId, tenantId } })
        : null,
      dto.jobTitleId
        ? this.prisma.jobTitle.findFirst({ where: { id: dto.jobTitleId, tenantId, active: true } })
        : null,
    ]);

    if (dto.departmentId && !department) {
      throw new NotFoundException('Departamento não pertence à empresa');
    }
    if (dto.shiftId && !shift) {
      throw new NotFoundException('Turno não pertence à empresa');
    }
    if (dto.jobTitleId && !jobTitle) {
      throw new NotFoundException('Cargo não pertence à empresa ou está inativo');
    }

    try {
      const employee = await this.prisma.employee.create({
        data: {
          tenantId,
          employeeCode: dto.employeeCode,
          name: dto.name,
          email: dto.email,
          jobTitle: jobTitle?.name ?? dto.jobTitle,
          jobTitleId: dto.jobTitleId,
          photoData,
          departmentId: dto.departmentId,
          shiftId: dto.shiftId,
        },
        include: { department: true, shift: true, jobTitleRef: true },
      });
      await this.audit(tenantId, actorUserId, 'EMPLOYEE_CREATED', employee.id, employee.name, employee.employeeCode);
      return employee;
    } catch {
      throw new ConflictException('Código de colaborador já existe');
    }
  }

  async update(tenantId: string, actorUserId: string, id: string, dto: UpdateEmployeeDto, photoData?: string) {
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
    let jobTitleName: string | null | undefined;
    if (dto.jobTitleId) {
      const jobTitle = await this.prisma.jobTitle.findFirst({ where: { id: dto.jobTitleId, tenantId, active: true } });
      if (!jobTitle) throw new NotFoundException('Cargo não pertence à empresa ou está inativo');
      jobTitleName = jobTitle.name;
    }

    const data = {
      ...dto,
      ...(dto.departmentId === '' ? { departmentId: null } : {}),
      ...(dto.shiftId === '' ? { shiftId: null } : {}),
      ...(dto.jobTitleId === '' ? { jobTitleId: null, jobTitle: null } : {}),
      ...(jobTitleName ? { jobTitle: jobTitleName } : {}),
      ...(photoData ? { photoData } : {}),
    };

    const updated = await this.prisma.employee.update({
      where: { id },
      data,
      include: { department: true, shift: true, jobTitleRef: true },
    });
    await this.audit(tenantId, actorUserId, 'EMPLOYEE_UPDATED', id, updated.name, updated.employeeCode);
    return updated;
  }

  private audit(tenantId: string, userId: string, action: string, entityId: string, name: string, employeeCode: string) { return this.prisma.auditLog.create({ data: { tenantId, userId, action, entity: 'EMPLOYEE', entityId, metadata: { name, employeeCode } } }); }
}
