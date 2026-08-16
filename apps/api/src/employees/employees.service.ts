import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, userId?: string) {
    return this.prisma.employee.findMany({
      where: { tenantId, ...(userId ? { userId } : {}) },
      include: { department: true, shift: true, jobTitleRef: true },
      orderBy: { name: 'asc' },
    });
  }
  async get(tenantId: string, id: string) { const employee = await this.prisma.employee.findFirst({ where: { id, tenantId } }); if (!employee) throw new NotFoundException('Colaborador não encontrado'); return employee; }

  async create(tenantId: string, actorUserId: string, dto: CreateEmployeeDto, photoData?: string) {
    const [department, shift, jobTitle, tenant] = await Promise.all([
      dto.departmentId
        ? this.prisma.department.findFirst({ where: { id: dto.departmentId, tenantId } })
        : null,
      dto.shiftId
        ? this.prisma.shift.findFirst({ where: { id: dto.shiftId, tenantId } })
        : null,
      dto.jobTitleId
        ? this.prisma.jobTitle.findFirst({ where: { id: dto.jobTitleId, tenantId, active: true } })
        : null,
      this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { emailDomain: true, usesOwnEmailDomain: true } }),
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
    if (dto.corporateEmail && (!tenant?.usesOwnEmailDomain || !tenant.emailDomain)) {
      throw new BadRequestException('Configure o domínio de e-mail corporativo nas configurações da empresa');
    }

    const employeeEmail = dto.corporateEmail
      ? await this.nextCorporateEmail(tenantId, dto.name, tenant!.emailDomain!)
      : dto.email;

    try {
      const employee = await this.prisma.employee.create({
        data: {
          tenantId,
          employeeCode: dto.employeeCode || await this.nextCode(tenantId),
          name: dto.name,
          email: employeeEmail,
          corporateEmail: dto.corporateEmail,
          jobTitle: jobTitle?.name ?? dto.jobTitle,
          jobTitleId: dto.jobTitleId,
          photoData,
          departmentId: dto.departmentId,
          shiftId: dto.shiftId,
        },
        include: { department: true, shift: true, jobTitleRef: true },
      });
      await this.audit(tenantId, actorUserId, 'EMPLOYEE_CREATED', employee.id, {
        name: employee.name,
        employeeCode: employee.employeeCode,
      });
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

    const wantsCorporateEmail = dto.corporateEmail ?? employee.corporateEmail;
    let employeeEmail: string | null | undefined = dto.email;
    if (wantsCorporateEmail) {
      if (employee.corporateEmail && employee.email) {
        employeeEmail = employee.email;
      } else {
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { emailDomain: true, usesOwnEmailDomain: true } });
        if (!tenant?.usesOwnEmailDomain || !tenant.emailDomain) {
          throw new BadRequestException('Configure o domínio de e-mail corporativo nas configurações da empresa');
        }
        employeeEmail = await this.nextCorporateEmail(tenantId, dto.name ?? employee.name, tenant.emailDomain, id);
      }
    } else if (dto.corporateEmail === false && employee.corporateEmail) {
      employeeEmail = dto.email ?? null;
    }

    const data = {
      ...dto,
      corporateEmail: wantsCorporateEmail,
      ...(employeeEmail !== undefined ? { email: employeeEmail } : {}),
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
    await this.audit(tenantId, actorUserId, 'EMPLOYEE_UPDATED', id, {
      name: updated.name,
      employeeCode: updated.employeeCode,
      before: {
        name: employee.name,
        email: employee.email,
        status: employee.status,
        departmentId: employee.departmentId,
        shiftId: employee.shiftId,
        jobTitleId: employee.jobTitleId,
        corporateEmail: employee.corporateEmail,
      },
      after: {
        name: updated.name,
        email: updated.email,
        status: updated.status,
        departmentId: updated.departmentId,
        shiftId: updated.shiftId,
        jobTitleId: updated.jobTitleId,
        corporateEmail: updated.corporateEmail,
      },
    });
    return updated;
  }

  private audit(tenantId: string, userId: string, action: string, entityId: string, metadata: { name: string; employeeCode: string; before?: object; after?: object }) { return this.prisma.auditLog.create({ data: { tenantId, userId, action, entity: 'EMPLOYEE', entityId, metadata } }); }
  private async nextCode(tenantId: string) { const employees = await this.prisma.employee.findMany({ where: { tenantId }, select: { employeeCode: true } }); const max = employees.reduce((highest, item) => Math.max(highest, Number(item.employeeCode.match(/EMP-(\d+)/i)?.[1] ?? 0)), 0); return `EMP-${String(max + 1).padStart(3, '0')}`; }
  private async nextCorporateEmail(tenantId: string, name: string, domain: string, excludeId?: string) {
    const nameParts = name.trim().split(/\s+/).filter(Boolean);
    const firstName = nameParts[0] ?? 'colaborador';
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
    const alias = `${firstName}${lastName ? `.${lastName}` : ''}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9.]+/g, '').replace(/^\.|\.$/g, '') || 'colaborador';
    let candidate = `${alias}@${domain}`;
    let suffix = 2;
    while (await this.prisma.employee.findFirst({ where: { tenantId, email: candidate, ...(excludeId ? { NOT: { id: excludeId } } : {}) }, select: { id: true } })) {
      candidate = `${alias}.${suffix}@${domain}`;
      suffix += 1;
    }
    return candidate;
  }
}
