module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test/e2e'],
  testMatch: ['**/*.e2e-spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
};
