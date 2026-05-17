/**
 * Authentication and authorisation middleware for the safety management API.
 *
 * Provides:
 *   - authenticateRequest: verifies a Bearer JWT from the Authorization header
 *   - requireRole:         restricts access to specific roles
 *   - requireTenant:       ensures the request is scoped to a specific tenant
 */

import type { IncomingMessage, ServerResponse } from 'http';
import { verifyToken, type JwtPayload } from '../utils/jwt';

/**
 * Augmented IncomingMessage with authenticated user details.
 *
 * When authenticateRequest passes, `req.user` is populated with the
 * decoded JWT payload so downstream handlers can access userId, tenantId, and role.
 */
export interface AuthenticatedRequest extends IncomingMessage {
  /** User info decoded from the JWT, set by authenticateRequest middleware. */
  user?: JwtPayload;
}

/** JSON response helper for middleware errors. */
function sendJson(res: ServerResponse, statusCode: number, data: Record<string, unknown>): void {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

/**
 * Middleware that verifies the JWT from the Authorization header.
 *
 * Expects header format: `Authorization: Bearer <token>`
 * On success, sets `req.user` to the decoded payload and calls next().
 * On failure, returns a 401 response and does NOT call next().
 *
 * @param req - Incoming HTTP request (will gain `.user` on success)
 * @param res - ServerResponse to write errors to
 * @returns `true` if authenticated, `false` if a 401 was sent
 */
export async function authenticateRequest(
  req: AuthenticatedRequest,
  res: ServerResponse,
): Promise<boolean> {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    sendJson(res, 401, {
      error: 'Unauthorized',
      message: 'Missing Authorization header. Expected: Bearer <token>',
    });
    return false;
  }

  const payload = verifyToken(authHeader);

  if (!payload) {
    sendJson(res, 401, {
      error: 'Unauthorized',
      message: 'Invalid or expired token',
    });
    return false;
  }

  req.user = payload;
  return true;
}

/**
 * Middleware factory that restricts access to one or more roles.
 *
 * Must be called AFTER authenticateRequest so that `req.user` is populated.
 *
 * @param allowedRoles - One or more role strings that are permitted access
 * @returns A middleware function that returns `true` if allowed, or sends 403 and returns `false`
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: ServerResponse): boolean => {
    if (!req.user) {
      sendJson(res, 401, {
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return false;
    }

    if (!allowedRoles.includes(req.user.role)) {
      sendJson(res, 403, {
        error: 'Forbidden',
        message: `Insufficient permissions. Required one of: ${allowedRoles.join(', ')}`,
      });
      return false;
    }

    return true;
  };
}

/**
 * Middleware that verifies the request is scoped to the expected tenant.
 *
 * The `expectedTenantId` can come from a route parameter, header, or the
 * authenticated user's own tenant. Compares against `req.user.tenantId`.
 *
 * @param req - Authenticated incoming request
 * @param res - ServerResponse to write errors to
 * @param expectedTenantId - The tenant ID to compare against
 * @returns `true` if the tenant matches, `false` if a 403 was sent
 */
export function requireTenant(
  req: AuthenticatedRequest,
  res: ServerResponse,
  expectedTenantId: string,
): boolean {
  if (!req.user) {
    sendJson(res, 401, {
      error: 'Unauthorized',
      message: 'Authentication required',
    });
    return false;
  }

  if (req.user.tenantId !== expectedTenantId) {
    sendJson(res, 403, {
      error: 'Forbidden',
      message: 'Tenant mismatch — you do not have access to this resource',
    });
    return false;
  }

  return true;
}
