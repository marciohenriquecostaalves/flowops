import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

type Attempt = { failures: number; windowStartedAt: number; blockedUntil: number };

@Injectable()
export class LoginRateLimitService {
  private readonly attempts = new Map<string, Attempt>();
  private readonly windowMs = 15 * 60 * 1000;
  private readonly maxFailures = 5;
  private readonly blockMs = 15 * 60 * 1000;

  assertAllowed(key: string) {
    const current = this.attempts.get(key);
    if (!current) return;
    const now = Date.now();
    if (current.blockedUntil > now) {
      throw new HttpException(
        'Muitas tentativas de login. Tente novamente mais tarde.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (now - current.windowStartedAt >= this.windowMs) this.attempts.delete(key);
  }

  registerFailure(key: string) {
    const now = Date.now();
    const current = this.attempts.get(key);
    const attempt = !current || now - current.windowStartedAt >= this.windowMs
      ? { failures: 1, windowStartedAt: now, blockedUntil: 0 }
      : { ...current, failures: current.failures + 1 };
    if (attempt.failures >= this.maxFailures) attempt.blockedUntil = now + this.blockMs;
    this.attempts.set(key, attempt);
  }

  reset(key: string) {
    this.attempts.delete(key);
  }
}
