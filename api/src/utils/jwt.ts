/**
 * JWT (JSON Web Token) utilities for authentication.
 *
 * Provides token creation and verification using jsonwebtoken.
 * Configured via environment variables:
 *   JWT_SECRET - Secret key for signing tokens (default: dev-secret-change-in-production)
 *   JWT_EXPIRY - Token expiration duration (default: 7d)
 */

import jwt, { type SignOptions } from 'jsonwebtoken';

/** Default secret for local development — override via JWT_SECRET in production */
const JWT_SECRET: string = process.env.JWT_SECRET || 'dev-secret-change-in-production';

/** Default token expiry — override via JWT_EXPIRY environment variable */
const TOKEN_EXPIRY: string = process.env.JWT_EXPIRY || '7d';

/** Shape of the payload embedded in every JWT. */
export interface JwtPayload {
  userId: string;
  tenantId: string;
  role: string;
}

/**
 * Sign (create) a JWT for the given user context.
 *
 * @param payload - Object containing userId, tenantId, and role
 * @returns Signed JWT string
 */
export function signToken(payload: JwtPayload): string {
  const options: SignOptions = {
    expiresIn: TOKEN_EXPIRY as any,
  };
  return jwt.sign(payload, JWT_SECRET, options);
}

/**
 * Verify and decode a JWT string.
 *
 * Returns the decoded payload on success, or null if the token is
 * invalid, expired, or missing any required fields.
 *
 * @param token - Raw JWT string (with or without "Bearer " prefix)
 * @returns Decoded JwtPayload or null
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    // Strip "Bearer " prefix if present
    const raw = token.startsWith('Bearer ') ? token.slice(7) : token;
    const decoded = jwt.verify(raw, JWT_SECRET) as Record<string, unknown>;

    // Strict tenant verification — all three fields must be present and non-empty
    if (
      typeof decoded.userId === 'string' &&
      decoded.userId.length > 0 &&
      typeof decoded.tenantId === 'string' &&
      decoded.tenantId.length > 0 &&
      typeof decoded.role === 'string' &&
      decoded.role.length > 0
    ) {
      return {
        userId: decoded.userId,
        tenantId: decoded.tenantId,
        role: decoded.role,
      };
    }

    return null;
  } catch (error) {
    return null;
  }
}
