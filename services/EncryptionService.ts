import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

export function encrypt(text: string): string {
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
  if (!ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY is not set');
  if (ENCRYPTION_KEY.length !== 32) throw new Error('ENCRYPTION_KEY must be exactly 32 characters long');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string): string {
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
  if (!ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY is not set');
  if (ENCRYPTION_KEY.length !== 32) throw new Error('ENCRYPTION_KEY must be exactly 32 characters long');
  const textParts = text.split(':');
  const ivStr = textParts.shift();
  if (!ivStr) throw new Error('Invalid iv');
  const iv = Buffer.from(ivStr, 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}
