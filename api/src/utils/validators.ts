/**
 * Zod validation schemas for authentication and API request bodies.
 *
 * Provides reusable schemas and a generic validation helper.
 */

import { z } from 'zod';

/**
 * Login request schema.
 *
 * Expects:
 *   email    - A valid email address
 *   password - At least 6 characters
 */
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

/**
 * Registration request schema.
 *
 * Expects:
 *   email      - A valid email address
 *   name       - At least 2 characters
 *   password   - At least 6 characters
 *   tenantSlug - At least 1 character (identifies the tenant/organisation)
 *   role       - Optional: 'admin', 'supervisor', or 'worker' (defaults handled elsewhere)
 */
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  tenantSlug: z.string().min(1, 'Tenant slug is required'),
  role: z.enum(['admin', 'supervisor', 'worker']).optional(),
});

/**
 * Generic validation helper.
 *
 * Wraps Zod's safeParse to return a consistent result shape.
 *
 * @param data   - The raw (unknown) data to validate
 * @param schema - A Zod schema to validate against
 * @returns An object with either `success: true` and parsed `data`,
 *          or `success: false` and an `errors` array of human-readable messages.
 */
export function validate(
  data: unknown,
  schema: z.ZodSchema,
): { success: true; data: any } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.issues.map(
    (issue) => `${issue.path.join('.')}: ${issue.message}`,
  );

  return { success: false, errors };
}
