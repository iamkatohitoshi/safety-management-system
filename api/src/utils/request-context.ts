/**
 * Authenticated request context types.
 *
 * Provides the shared type definitions for the authenticated user
 * context that flows through the request lifecycle.
 */

/**
 * Decoded authentication context extracted from the JWT.
 */
export interface AuthContext {
  /** Unique user identifier (UUID). */
  userId: string;
  /** Tenant (organisation) the user belongs to. */
  tenantId: string;
  /** User role: 'admin', 'supervisor', or 'worker'. */
  role: string;
}

/**
 * An HTTP request that carries an authenticated user context.
 *
 * Route handlers that require authentication should use this type
 * for their `req` parameter.
 */
export interface AuthenticatedRequest {
  /** Authentication context set by the auth middleware. */
  auth: AuthContext;
}
