import { describe, it, expect } from 'vitest';
import { PasswordService } from '../../../src/modules/auth/services/password.service.js';

describe('PasswordService', () => {
  const service = new PasswordService(4);

  it('hashes a password and verifies it', async () => {
    const hash = await service.hash('my-secret-pass');

    expect(hash).not.toBe('my-secret-pass');
    expect(hash).toMatch(/^\$2[aby]\$/);

    const valid = await service.verify('my-secret-pass', hash);
    expect(valid).toBe(true);
  });

  it('rejects wrong password', async () => {
    const hash = await service.hash('correct-password');
    const valid = await service.verify('wrong-password', hash);
    expect(valid).toBe(false);
  });

  it('produces different hashes for same input (salt)', async () => {
    const hash1 = await service.hash('same-input');
    const hash2 = await service.hash('same-input');
    expect(hash1).not.toBe(hash2);
  });
});
