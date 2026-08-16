import { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';

const prisma = new PrismaClient();

function hashPassword(password: string) {
  return createHash('sha256').update(password).digest('hex');
}

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'flowops-demo' },
    update: {},
    create: { name: 'FlowOps Demo', slug: 'flowops-demo' },
  });

  const unit = await prisma.businessUnit.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'MATRIZ' } },
    update: { name: tenant.name, active: true, type: 'HEADQUARTERS' },
    create: { tenantId: tenant.id, code: 'MATRIZ', name: tenant.name, type: 'HEADQUARTERS' },
  });

  const permissions = [
    ['dashboard.read', 'Visualizar dashboards'],
    ['employees.read', 'Visualizar colaboradores'],
    ['employees.write', 'Gerenciar colaboradores'],
    ['activities.read', 'Visualizar atividades'],
    ['activities.write', 'Gerenciar atividades'],
    ['sessions.write', 'Iniciar e controlar sessões'],
    ['audit.read', 'Visualizar auditoria'],
  ];

  for (const [key, description] of permissions) {
    await prisma.permission.upsert({
      where: { key },
      update: { description },
      create: { key, description },
    });
  }

  const roles = await Promise.all([
    prisma.role.upsert({ where: { tenantId_name: { tenantId: tenant.id, name: 'ADMIN' } }, update: {}, create: { tenantId: tenant.id, name: 'ADMIN', description: 'Administrador da empresa' } }),
    prisma.role.upsert({ where: { tenantId_name: { tenantId: tenant.id, name: 'SUPERVISOR' } }, update: {}, create: { tenantId: tenant.id, name: 'SUPERVISOR', description: 'Supervisor operacional' } }),
    prisma.role.upsert({ where: { tenantId_name: { tenantId: tenant.id, name: 'OPERATOR' } }, update: {}, create: { tenantId: tenant.id, name: 'OPERATOR', description: 'Operador' } }),
    prisma.role.upsert({ where: { tenantId_name: { tenantId: tenant.id, name: 'FOREMAN' } }, update: {}, create: { tenantId: tenant.id, name: 'FOREMAN', description: 'Encarregado de departamento' } }),
  ]);
  const role = roles.find((item) => item.name === 'ADMIN')!;

  const allPermissions = await prisma.permission.findMany();
  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
      update: {},
      create: { roleId: role.id, permissionId: permission.id },
    });
  }

  const user = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@flowops.local' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'admin@flowops.local',
      name: 'Administrador FlowOps',
      passwordHash: hashPassword('ChangeMe123!'),
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    update: {},
    create: { userId: user.id, roleId: role.id },
  });

  await prisma.userUnitAccess.upsert({
    where: { userId_unitId: { userId: user.id, unitId: unit.id } },
    update: { isPrimary: true },
    create: { userId: user.id, unitId: unit.id, isPrimary: true },
  });

  const department = await prisma.department.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Operação' } },
    update: { unitId: unit.id },
    create: { tenantId: tenant.id, unitId: unit.id, name: 'Operação' },
  });

  const shift = await prisma.shift.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: '1º Turno' } },
    update: {},
    create: {
      tenantId: tenant.id,
      unitId: unit.id,
      name: '1º Turno',
      startTime: '07:00',
      endTime: '16:48',
      toleranceMinutes: 10,
    },
  });

  const activity = await prisma.activity.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'SEPARACAO' } },
    update: { unitId: unit.id, departmentId: department.id },
    create: {
      tenantId: tenant.id,
      unitId: unit.id,
      departmentId: department.id,
      code: 'SEPARACAO',
      name: 'Separação',
      targetPerHour: 120,
    },
  });

  const jobTitle = await prisma.jobTitle.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Operador logístico' } },
    update: { unitId: unit.id },
    create: { tenantId: tenant.id, unitId: unit.id, name: 'Operador logístico' },
  });

  const employee = await prisma.employee.upsert({
    where: { tenantId_employeeCode: { tenantId: tenant.id, employeeCode: 'EMP-001' } },
    update: { unitId: unit.id, departmentId: department.id, shiftId: shift.id, jobTitleId: jobTitle.id, jobTitle: jobTitle.name },
    create: {
      tenantId: tenant.id,
      unitId: unit.id,
      employeeCode: 'EMP-001',
      badgeCode: 'CR-00000001',
      name: 'Colaborador Demo',
      email: 'colaborador@flowops.local',
      departmentId: department.id,
      shiftId: shift.id,
      jobTitleId: jobTitle.id,
      jobTitle: jobTitle.name,
    },
  });

  console.log({ tenant: tenant.slug, user: user.email, department: department.name, shift: shift.name, activity: activity.code, jobTitle: jobTitle.name, employee: employee.employeeCode });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
