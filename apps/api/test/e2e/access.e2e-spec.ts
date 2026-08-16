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
  let adminToken: string;
  let operatorToken: string;
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
    const roles = await Promise.all(['ADMIN', 'SUPERVISOR', 'OPERATOR', 'FOREMAN'].map((name) => prisma.role.create({ data: { tenantId, name } })));
    const adminRole = roles.find((role) => role.name === 'ADMIN')!;
    await prisma.user.create({
      data: {
        tenantId,
        name: `${prefix} ADMIN`,
        email: `${prefix}@flowops.local`,
        passwordHash: hashPassword('ChangeMe123!'),
        roles: { create: { roleId: adminRole.id } },
      },
    });
    const department = await prisma.department.create({ data: { tenantId, name: `${prefix} Operação` } });
    const shift = await prisma.shift.create({ data: { tenantId, name: `${prefix} Turno`, startTime: '07:00', endTime: '16:48' } });
    departmentId = department.id;
    shiftId = shift.id;

    const adminLogin = await login(`${prefix}@flowops.local`, 'ChangeMe123!');
    adminToken = adminLogin.accessToken;

    for (const role of ['SUPERVISOR', 'OPERATOR', 'FOREMAN'] as const) {
      const employee = await prisma.employee.create({
        data: {
          tenantId,
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
    expect((await http('/users', { token: supervisorToken })).status).toBe(403);

    expect((await http('/operations/sessions/active', { token: operatorToken })).status).toBe(200);
    expect((await http('/reports/productivity', { token: operatorToken })).status).toBe(403);
    const operatorEmployees = await http('/employees', { token: operatorToken });
    expect(operatorEmployees.status).toBe(200);
    expect(operatorEmployees.body).toHaveLength(1);
    expect(operatorEmployees.body[0].id).toBe(employeeIds.OPERATOR);

    expect((await http('/reports/productivity', { token: foremanToken })).status).toBe(200);
    expect((await http('/operations/sessions/active', { token: foremanToken })).status).toBe(200);
    expect((await http('/employees', { token: foremanToken })).status).toBe(403);
  });

  it('rejects a revoked user token immediately', async () => {
    const revoke = await http(`/employees/${employeeIds.OPERATOR}/access`, { method: 'DELETE', token: adminToken });
    expect(revoke.status).toBe(200);
    expect((await http('/operations/sessions/active', { token: operatorToken })).status).toBe(401);
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
});
