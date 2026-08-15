import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, storedHash: string) {
  if (!storedHash.startsWith('scrypt$')) {
    const legacy = createHash('sha256').update(password).digest('hex');
    return safeEqual(legacy, storedHash);
  }

  const [, salt, stored] = storedHash.split('$');
  if (!salt || !stored) return false;
  return safeEqual(scryptSync(password, salt, 64).toString('hex'), stored);
}

function safeEqual(a: string, b: string) {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}
