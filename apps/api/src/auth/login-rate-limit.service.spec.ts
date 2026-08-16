import { HttpException, HttpStatus } from '@nestjs/common';
import { LoginRateLimitService } from './login-rate-limit.service';

describe('LoginRateLimitService', () => {
  it('blocks the sixth failed attempt and resets after a successful login', () => {
    const service = new LoginRateLimitService();
    for (let attempt = 0; attempt < 5; attempt += 1) service.registerFailure('ip:user@example.com');
    expect(() => service.assertAllowed('ip:user@example.com')).toThrow(HttpException);
    try {
      service.assertAllowed('ip:user@example.com');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    }
    service.reset('ip:user@example.com');
    expect(() => service.assertAllowed('ip:user@example.com')).not.toThrow();
  });

  it('keeps independent keys isolated', () => {
    const service = new LoginRateLimitService();
    for (let attempt = 0; attempt < 5; attempt += 1) service.registerFailure('ip:user@example.com');
    expect(() => service.assertAllowed('other-ip:user@example.com')).not.toThrow();
  });
});
