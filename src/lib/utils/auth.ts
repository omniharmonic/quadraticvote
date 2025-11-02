import { randomBytes, createCipheriv, createDecipheriv, createHash } from 'crypto';

/**
 * Generate a cryptographically secure invite code
 */
export function generateInviteCode(): string {
  // Generate 32-byte random string, base64url encoded
  return randomBytes(32).toString('base64url');
}

/**
 * Hash a string using SHA256 (for anonymous IDs)
 */
export function hashString(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Encrypt email for storage (AES-256-GCM)
 */
export function encryptEmail(email: string): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY not configured');
  }
  
  const ALGORITHM = 'aes-256-gcm';
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, Buffer.from(key, 'hex'), iv);
  
  let encrypted = cipher.update(email, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Return: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt email from storage
 */
export function decryptEmail(encrypted: string): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY not configured');
  }
  
  const [ivHex, authTagHex, encryptedData] = encrypted.split(':');
  
  const ALGORITHM = 'aes-256-gcm';
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, Buffer.from(key, 'hex'), iv);
  
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Hash IP address for privacy (SHA256)
 */
export function hashIpAddress(ip: string): string {
  return createHash('sha256').update(ip).digest('hex');
}

