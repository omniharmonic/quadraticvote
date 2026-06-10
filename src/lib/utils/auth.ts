import { randomBytes, createHash } from 'crypto';

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
 * Hash IP address for privacy (SHA256)
 */
export function hashIpAddress(ip: string): string {
  return createHash('sha256').update(ip).digest('hex');
}

