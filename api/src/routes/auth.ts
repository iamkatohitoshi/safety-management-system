/**
 * Authentication routes for the safety management API.
 *
 * Provides:
 *   - POST /api/auth/login    — Authenticate with email + password, returns JWT
 *   - POST /api/auth/register — Create a new user account
 *   - GET  /api/auth/me       — Get the currently authenticated user's profile
 *
 * All routes return JSON. Uses bcryptjs for password hashing and jsonwebtoken for tokens.
 */

import type { ServerResponse } from 'http';
import bcrypt from 'bcryptjs';
import { signToken } from '../utils/jwt';
import { loginSchema, registerSchema, validate } from '../utils/validators';
import { query } from '../utils/db';
import { authenticateRequest, type AuthenticatedRequest } from '../middleware/auth';

/** JSON response helper. */
function sendJson(res: ServerResponse, statusCode: number, data: unknown): void {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

/**
 * POST /api/auth/login
 *
 * Authenticates a user with email and password. On success, returns a
 * signed JWT along with user profile information.
 *
 * Request body (JSON):
 *   { "email": "...", "password": "..." }
 *
 * Response 200:
 *   { "token": "...", "user": { "id", "name", "email", "role", "tenantId" } }
 *
 * Response 400: validation errors
 * Response 401: invalid credentials
 */
export async function handleLogin(
  req: AuthenticatedRequest,
  res: ServerResponse,
  body: unknown,
): Promise<void> {
  try {
    // Validate request body
    const validation = validate(body, loginSchema);
    if (!validation.success) {
      sendJson(res, 400, {
        error: 'Validation Error',
        message: validation.errors.join('; '),
      });
      return;
    }

    const { email, password } = validation.data;

    // Query user by email
    const result = await query(
      'SELECT id, name, email, password_hash, role, tenant_id FROM users WHERE email = $1',
      [email],
    );

    if (result.rows.length === 0) {
      sendJson(res, 401, {
        error: 'Unauthorized',
        message: 'Invalid email or password',
      });
      return;
    }

    const user = result.rows[0];

    // Compare password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      sendJson(res, 401, {
        error: 'Unauthorized',
        message: 'Invalid email or password',
      });
      return;
    }

    // Sign JWT
    const token = signToken({
      userId: user.id,
      tenantId: user.tenant_id,
      role: user.role,
    });

    // Return token + user info (excluding password_hash)
    sendJson(res, 200, {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenant_id,
      },
    });
  } catch (err: any) {
    console.error('[Auth] Login error:', err);
    sendJson(res, 500, {
      error: 'Internal Server Error',
      message: 'An unexpected error occurred during login',
    });
  }
}

/**
 * POST /api/auth/register
 *
 * Creates a new user account within an existing tenant. Checks that the
 * tenant slug exists and that the email is not already taken.
 *
 * Request body (JSON):
 *   { "email": "...", "name": "...", "password": "...", "tenantSlug": "...", "role": "..." }
 *
 * Response 201:
 *   { "token": "...", "user": { "id", "name", "email", "role", "tenantId" } }
 *
 * Response 400: validation errors, tenant not found, or email already taken
 */
export async function handleRegister(
  req: AuthenticatedRequest,
  res: ServerResponse,
  body: unknown,
): Promise<void> {
  try {
    // Validate request body
    const validation = validate(body, registerSchema);
    if (!validation.success) {
      sendJson(res, 400, {
        error: 'Validation Error',
        message: validation.errors.join('; '),
      });
      return;
    }

    const { email, name, password, tenantSlug, role } = validation.data;
    const userRole = role || 'worker';

    // Check that the tenant exists
    const tenantResult = await query(
      'SELECT id FROM tenants WHERE slug = $1',
      [tenantSlug],
    );

    if (tenantResult.rows.length === 0) {
      sendJson(res, 400, {
        error: 'Bad Request',
        message: `Tenant with slug "${tenantSlug}" not found`,
      });
      return;
    }

    const tenantId = tenantResult.rows[0].id;

    // Check email uniqueness within the tenant
    const emailCheck = await query(
      'SELECT id FROM users WHERE email = $1 AND tenant_id = $2',
      [email, tenantId],
    );

    if (emailCheck.rows.length > 0) {
      sendJson(res, 400, {
        error: 'Bad Request',
        message: 'A user with this email already exists in this tenant',
      });
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert the new user
    const insertResult = await query(
      `INSERT INTO users (name, email, password_hash, role, tenant_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role, tenant_id`,
      [name, email, passwordHash, userRole, tenantId],
    );

    const newUser = insertResult.rows[0];

    // Sign JWT
    const token = signToken({
      userId: newUser.id,
      tenantId: newUser.tenant_id,
      role: newUser.role,
    });

    sendJson(res, 201, {
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        tenantId: newUser.tenant_id,
      },
    });
  } catch (err: any) {
    console.error('[Auth] Register error:', err);
    sendJson(res, 500, {
      error: 'Internal Server Error',
      message: 'An unexpected error occurred during registration',
    });
  }
}

/**
 * GET /api/auth/me
 *
 * Returns the currently authenticated user's profile from the database.
 *
 * Headers:
 *   Authorization: Bearer <token>
 *
 * Response 200:
 *   { "user": { "id", "name", "email", "role", "tenantId", "createdAt" } }
 *
 * Response 401: missing or invalid token
 * Response 404: user not found (e.g. deleted since token was issued)
 */
export async function handleMe(
  req: AuthenticatedRequest,
  res: ServerResponse,
): Promise<void> {
  try {
    // Authenticate the request
    const authenticated = await authenticateRequest(req, res);
    if (!authenticated) {
      return; // Response already sent by middleware
    }

    // Fetch full user profile from DB
    const result = await query(
      'SELECT id, name, email, role, tenant_id, created_at FROM users WHERE id = $1',
      [req.user!.userId],
    );

    if (result.rows.length === 0) {
      sendJson(res, 404, {
        error: 'Not Found',
        message: 'User not found',
      });
      return;
    }

    const user = result.rows[0];

    sendJson(res, 200, {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenant_id,
        createdAt: user.created_at,
      },
    });
  } catch (err: any) {
    console.error('[Auth] Me error:', err);
    sendJson(res, 500, {
      error: 'Internal Server Error',
      message: 'An unexpected error occurred while fetching user profile',
    });
  }
}
