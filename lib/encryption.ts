import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

// We hash the SESSION_SECRET defined in Phase 1 to guarantee exactly 32 bytes for the AES block length
const ENCRYPTION_KEY = crypto
  .createHash('sha256')
  .update(process.env.SESSION_SECRET || 'fallback_secret')
  .digest();

export function encryptString(text: string): string {
  // 16-byte initialization vector
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // GCM provides authenticated encryption, guaranteeing the data wasn't tampered with
  const authTag = cipher.getAuthTag().toString('hex');

  // We return a unified structure to easily store into Firestore
  // Format: "iv:encrypted:authTag"
  return `${iv.toString('hex')}:${encrypted}:${authTag}`;
}

export function decryptString(encryptedPayload: string): string {
  if (!encryptedPayload) return '';
  
  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload format string inside database.');
  }

  const [ivHex, encryptedHex, authTagHex] = parts;
  
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    ENCRYPTION_KEY,
    Buffer.from(ivHex, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
