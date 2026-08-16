import type { INestApplication } from '@nestjs/common';
import { AddressInfo } from 'node:net';
import { createApp } from '../../src/main';
import { PrismaService } from '../../src/prisma/prisma.service';
import { hashPassword } from '../../src/auth/password';

type HttpOptions = { method?: string; token?: string; body?: unknown };
type HttpResult = { status: number; body: any };

describe('access control (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let baseUrl: string;
  let tenantId: string;
  let departmentId: string;
  let shiftId: string;
  let activityId: string;
  let adminToken: string;
  let operatorToken: string;
  let supervisorUserId: string;
  const password = 'FlowOps@2026';
  const prefix = `e2e-${Date.now()}`;
  const employeeIds: Record<string, string> = {};
  const userEmails: string[] = [];

  beforeAll(async () => {
    if (process.env.FLOWOPS_E2E !== 'true') {
      throw new Error('Defina FLOWOPS_E2E=true e use um banco de teste isolado para executar os testes E2E.');
    }

    app = await createApp();
    await app.listen(0, '127.0.0.1');
    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}/api`;
    prisma = app.get(PrismaService);

    const tenant = await prisma.tenant.create({ data: { name: `${prefix} Tenant`, slug: prefix } });
    tenantId = tenant.id;
    const unit = await prisma.businessUnit.create({ data: { tenantId, name: `${prefix} Matriz`, code: 'MATRIZ', type: 'HEADQUARTERS' } });
    const roles = await Promise.all(['ADMIN', 'SUPERVISOR', 'OPERATOR', 'FOREMAN'].map((name) => prisma.role.create({ data: { tenantId, name } })));
    const adminRole = roles.find((role) => role.name === 'ADMIN')!;
    const admin = await prisma.user.create({
      data: {
        tenantId,
        name: `${prefix} ADMIN`,
        email: `${prefix}@flowops.local`,
        passwordHash: hashPassword('ChangeMe123!'),
        roles: { create: { roleId: adminRole.id } },
      },
    });
    await prisma.userUnitAccess.create({ data: { userId: admin.id, unitId: unit.id, isPrimary: true } });
    const department = await prisma.department.create({ data: { tenantId, unitId: unit.id, name: `${prefix} Operação` } });
    const shift = await prisma.shift.create({ data: { tenantId, unitId: unit.id, name: `${prefix} Turno`, startTime: '07:00', endTime: '16:48' } });
    const activity = await prisma.activity.create({ data: { tenantId, unitId: unit.id, name: `${prefix} Separação`, code: `${prefix}-SEP`, departmentId: department.id } });
    departmentId = department.id;
    shiftId = shift.id;
    activityId = activity.id;

    const adminLogin = await login(`${prefix}@flowops.local`, 'ChangeMe123!');
    adminToken = adminLogin.accessToken;

    for (const role of ['SUPERVISOR', 'OPERATOR', 'FOREMAN'] as const) {
      const employee = await prisma.employee.create({
        data: {
          tenantId,
          unitId: unit.id,
          employeeCode: `${prefix}-${role}`,
          name: `${prefix} ${role}`,
          departmentId,
          shiftId,
        },
      });
      employeeIds[role] = employee.id;
      const email = `${prefix}-${role.toLowerCase()}@flowops.local`;
      userEmails.push(email);
      const provision = await http(`/employees/${employee.id}/access`, {
        method: 'POST',
        token: adminToken,
        body: { email, password, role },
      });
      expect(provision.status).toBe(201);
      if (role === 'SUPERVISOR') {
        const provisionedUser = await prisma.user.findUnique({ where: { tenantId_email: { tenantId, email } }, select: { id: true } });
        supervisorUserId = provisionedUser!.id;
      }
    }

    operatorToken = (await login(userEmails.find((email) => email.includes('-operator@'))!, password)).accessToken;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.tenant.delete({ where: { id: tenantId } });
    }
    await app?.close();
  });

  it('allows each profile only the intended API areas', async () => {
    const supervisorToken = (await login(userEmails.find((email) => email.includes('-supervisor@'))!, password)).accessToken;
    const foremanToken = (await login(userEmails.find((email) => email.includes('-foreman@'))!, password)).accessToken;

    expect((await http('/users', { token: adminToken })).status).toBe(200);
    expect((await http('/settings', { token: adminToken })).status).toBe(200);

    expect((await http('/employees', { token: supervisorToken })).status).toBe(200);
    expect((await http('/reports/productivity', { token: supervisorToken })).status).toBe(200);
    expect((await http('/history/punches', { token: supervisorToken })).status).toBe(200);
    expect((await http('/users', { token: supervisorToken })).status).toBe(403);

    expect((await http('/operations/sessions/active', { token: operatorToken })).status).toBe(200);
    expect((await http('/history/punches', { token: operatorToken })).status).toBe(200);
    expect((await http('/reports/productivity', { token: operatorToken })).status).toBe(403);
    const operatorEmployees = await http('/employees', { token: operatorToken });
    expect(operatorEmployees.status).toBe(200);
    expect(operatorEmployees.body).toHaveLength(1);
    expect(operatorEmployees.body[0].id).toBe(employeeIds.OPERATOR);

    expect((await http('/reports/productivity', { token: foremanToken })).status).toBe(200);
    expect((await http('/history/punches', { token: foremanToken })).status).toBe(200);
    expect((await http('/operations/sessions/active', { token: foremanToken })).status).toBe(200);
    expect((await http('/employees', { token: foremanToken })).status).toBe(403);
  });

  it('rejects a revoked user token immediately', async () => {
    const revoke = await http(`/employees/${employeeIds.OPERATOR}/access`, { method: 'DELETE', token: adminToken });
    expect(revoke.status).toBe(200);
    expect((await http('/operations/sessions/active', { token: operatorToken })).status).toBe(401);
  });

  it('keeps branch data isolated for users assigned to that branch', async () => {
    const branch = await http('/business-units', { method: 'POST', token: adminToken, body: { name: `${prefix} Filial`, code: `${prefix.slice(0, 8).toUpperCase()}-F`, type: 'BRANCH' } });
    expect(branch.status).toBe(201);
    const branchDepartment = await http('/departments', { method: 'POST', token: adminToken, body: { name: `${prefix} Filial Operação`, unitId: branch.body.id } });
    expect(branchDepartment.status).toBe(201);
    const branchEmployee = await http('/employees', { method: 'POST', token: adminToken, body: { name: `${prefix} Filial Colaborador`, unitId: branch.body.id, departmentId: branchDepartment.body.id } });
    expect(branchEmployee.status).toBe(201);

    const assign = await http(`/users/${supervisorUserId}/units`, { method: 'PATCH', token: adminToken, body: { unitIds: [branch.body.id] } });
    expect(assign.status).toBe(200);

    const scopedEmployees = await http('/employees', { token: (await login(userEmails.find((email) => email.includes('-supervisor@'))!, password)).accessToken });
    expect(scopedEmployees.status).toBe(200);
    expect(scopedEmployees.body).toHaveLength(1);
    expect(scopedEmployees.body[0].id).toBe(branchEmployee.body.id);
    const scopedDepartments = await http('/departments', { token: (await login(userEmails.find((email) => email.includes('-supervisor@'))!, password)).accessToken });
    expect(scopedDepartments.status).toBe(200);
    expect(scopedDepartments.body).toHaveLength(1);
    expect(scopedDepartments.body[0].id).toBe(branchDepartment.body.id);
  });

  it('registers the four kiosk punches in sequence', async () => {
    const badgeCode = `${prefix}-BADGE`.toUpperCase();
    await prisma.employee.update({ where: { id: employeeIds.OPERATOR }, data: { badgeCode } });
    const kiosk = await http('/kiosk/devices', {
      method: 'POST',
      token: adminToken,
      body: { name: `${prefix} Quiosque`, activityId },
    });
    expect(kiosk.status).toBe(201);

    const previousDebounce = process.env.KIOSK_PUNCH_DEBOUNCE_SECONDS;
    process.env.KIOSK_PUNCH_DEBOUNCE_SECONDS = '0';
    try {
      const expected = ['START', 'PAUSE', 'RESUME', 'FINISH'];
      const actual: string[] = [];
      for (const type of expected) {
        const result = await kioskHttp('/kiosk/punch', kiosk.body.code, kiosk.body.token, badgeCode);
        expect(result.status).toBe(201);
        actual.push(result.body.type);
      }
      expect(actual).toEqual(expected);
    } finally {
      if (previousDebounce === undefined) delete process.env.KIOSK_PUNCH_DEBOUNCE_SECONDS;
      else process.env.KIOSK_PUNCH_DEBOUNCE_SECONDS = previousDebounce;
    }

    const rotated = await http(`/kiosk/devices/${kiosk.body.id}/token`, {
      method: 'POST',
      token: adminToken,
    });
    expect(rotated.status).toBe(201);
    expect(rotated.body.token).toBeTruthy();
    expect(rotated.body.token).not.toBe(kiosk.body.token);
    expect((await kioskHttp('/kiosk/punch', kiosk.body.code, kiosk.body.token, badgeCode)).status).toBe(401);
    const previousDebounceAfterFinish = process.env.KIOSK_PUNCH_DEBOUNCE_SECONDS;
    process.env.KIOSK_PUNCH_DEBOUNCE_SECONDS = '0';
    try {
      expect((await kioskHttp('/kiosk/punch', kiosk.body.code, rotated.body.token, badgeCode)).status).toBe(201);
    } finally {
      if (previousDebounceAfterFinish === undefined) delete process.env.KIOSK_PUNCH_DEBOUNCE_SECONDS;
      else process.env.KIOSK_PUNCH_DEBOUNCE_SECONDS = previousDebounceAfterFinish;
    }
  });

  it('blocks inactive employees and concurrent duplicate punches', async () => {
    const badgeCode = `${prefix}-FOREMAN-BADGE`.toUpperCase();
    await prisma.employee.update({ where: { id: employeeIds.FOREMAN }, data: { badgeCode, status: 'ACTIVE' } });
    const kiosk = await http('/kiosk/devices', {
      method: 'POST',
      token: adminToken,
      body: { name: `${prefix} Quiosque Protegido`, activityId },
    });
    expect(kiosk.status).toBe(201);

    const previousDebounce = process.env.KIOSK_PUNCH_DEBOUNCE_SECONDS;
    process.env.KIOSK_PUNCH_DEBOUNCE_SECONDS = '5';
    try {
      const concurrent = await Promise.all([
        kioskHttp('/kiosk/punch', kiosk.body.code, kiosk.body.token, badgeCode),
        kioskHttp('/kiosk/punch', kiosk.body.code, kiosk.body.token, badgeCode),
      ]);
      expect(concurrent.map((result) => result.status).sort()).toEqual([201, 409]);

      await prisma.employee.update({ where: { id: employeeIds.FOREMAN }, data: { status: 'INACTIVE' } });
      expect((await kioskHttp('/kiosk/punch', kiosk.body.code, kiosk.body.token, badgeCode)).status).toBe(404);
    } finally {
      if (previousDebounce === undefined) delete process.env.KIOSK_PUNCH_DEBOUNCE_SECONDS;
      else process.env.KIOSK_PUNCH_DEBOUNCE_SECONDS = previousDebounce;
    }
  });

  it('generates a unique numeric badge automatically for new employees', async () => {
    const first = await http('/employees', {
      method: 'POST',
      token: adminToken,
      body: { name: `${prefix} Novo 1` },
    });
    const second = await http('/employees', {
      method: 'POST',
      token: adminToken,
      body: { name: `${prefix} Novo 2` },
    });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.badgeCode).toMatch(/^CR-\d{8}$/);
    expect(second.body.badgeCode).toMatch(/^CR-\d{8}$/);
    expect(second.body.badgeCode).not.toBe(first.body.badgeCode);
  });

  async function login(email: string, loginPassword: string) {
    const result = await http('/auth/login', { method: 'POST', body: { email, password: loginPassword } });
    expect(result.status).toBe(201);
    return result.body as { accessToken: string; refreshToken: string };
  }

  async function http(path: string, options: HttpOptions = {}): Promise<HttpResult> {
    const response = await fetch(`${baseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        'content-type': 'application/json',
        ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      },
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    });
    const text = await response.text();
    let body: any = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
    return { status: response.status, body };
  }

  async function kioskHttp(path: string, code: string, token: string, badgeCode: string): Promise<HttpResult> {
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-kiosk-code': code, 'x-kiosk-token': token },
      body: JSON.stringify({ badgeCode }),
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  }
});
