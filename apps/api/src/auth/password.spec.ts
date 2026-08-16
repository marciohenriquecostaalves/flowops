import { PASSWORD_PATTERN } from './password';

describe('password policy', () => {
  it('accepts a strong password', () => {
    expect(PASSWORD_PATTERN.test('FlowOps@2026')).toBe(true);
  });

  it.each(['short1!', 'alllowercase1!', 'ALLUPPERCASE1!', 'NoNumber!', 'NoSymbol1'])('rejects weak password %s', (password) => {
    expect(PASSWORD_PATTERN.test(password)).toBe(false);
  });
});
