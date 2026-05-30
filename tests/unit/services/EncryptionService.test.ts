import { describe, it, expect, beforeEach } from 'vitest';
import { encrypt, decrypt } from '../../../services/EncryptionService.js';

describe('EncryptionService', () => {
  const testKey = '0123456789abcdef0123456789abcdef'; // 32 chars

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = testKey;
  });

  it('should encrypt and decrypt correctly', () => {
    const originalText = 'Hello Ummah';
    const encrypted = encrypt(originalText);
    expect(encrypted).not.toBe(originalText);
    expect(encrypted).toContain(':'); // IV separator

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(originalText);
  });

  it('should fail to decrypt with wrong key', () => {
    const originalText = 'Secret';
    const encrypted = encrypt(originalText);

    process.env.ENCRYPTION_KEY = 'wrongkeywrongkeywrongkeywrongkey';

    expect(() => decrypt(encrypted)).toThrow();
  });
});
