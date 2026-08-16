import { AccessAreasGuard } from './access-areas.guard';

function context(user: { roles?: string[]; accessAreas?: string[] }, required: string[] | undefined) {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    required,
  } as any;
}

describe('AccessAreasGuard', () => {
  function guardFor(required: string[] | undefined) {
    return new AccessAreasGuard({ getAllAndOverride: () => required } as any);
  }

  it('allows an administrator in every area', () => {
    expect(guardFor(['reports']).canActivate(context({ roles: ['ADMIN'], accessAreas: [] }, ['reports']))).toBe(true);
  });

  it('uses the default areas for an operator', () => {
    const guard = guardFor(['operations']);
    expect(guard.canActivate(context({ roles: ['OPERATOR'] }, ['operations']))).toBe(true);
    expect(guardFor(['reports']).canActivate(context({ roles: ['OPERATOR'] }, ['reports']))).toBe(false);
  });

  it('honors a customized area list', () => {
    const guard = guardFor(['reports']);
    expect(guard.canActivate(context({ roles: ['SUPERVISOR'], accessAreas: ['dashboard', 'reports'] }, ['reports']))).toBe(true);
    expect(guard.canActivate(context({ roles: ['SUPERVISOR'], accessAreas: ['dashboard'] }, ['reports']))).toBe(false);
  });

  it('allows a foreman only in the configured default areas', () => {
    const guard = guardFor(['dashboard']);
    expect(guard.canActivate(context({ roles: ['FOREMAN'] }, ['dashboard']))).toBe(true);
    expect(guardFor(['employees']).canActivate(context({ roles: ['FOREMAN'] }, ['employees']))).toBe(false);
  });

  it('does not restrict routes without an access-area declaration', () => {
    expect(guardFor(undefined).canActivate(context({ roles: ['FOREMAN'] }, undefined))).toBe(true);
  });
});
