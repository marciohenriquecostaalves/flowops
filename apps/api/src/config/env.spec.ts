import { validateEnv } from './env';

const valid = {
  DATABASE_URL: 'postgresql://flowops:flowops@localhost:5432/flowops',
  JWT_ACCESS_SECRET: 'a'.repeat(40),
  JWT_REFRESH_SECRET: 'b'.repeat(40),
};

describe('environment validation', () => {
  it('requires database and JWT secrets', () => {
    expect(() => validateEnv({})).toThrow('DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET');
  });

  it('normalizes the API port', () => {
    expect(validateEnv({ ...valid, API_PORT: '4100' }).API_PORT).toBe(4100);
  });

  it('rejects placeholder secrets in production', () => {
    expect(() => validateEnv({ ...valid, NODE_ENV: 'production', JWT_ACCESS_SECRET: 'replace-me' }))
      .toThrow('JWT_ACCESS_SECRET');
  });

  it('rejects placeholder secrets in staging', () => {
    expect(() => validateEnv({ ...valid, NODE_ENV: 'staging', JWT_REFRESH_SECRET: 'troque-por-um-secret-aleatorio' }))
      .toThrow('JWT_REFRESH_SECRET');
  });
});
