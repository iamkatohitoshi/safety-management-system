/**
 * Form Definitions CRUD route handlers.
 *
 * Endpoints:
 *   GET    /api/form-definitions        — List form definitions for a tenant
 *   POST   /api/form-definitions        — Create a new form definition
 *   GET    /api/form-definitions/:id    — Get a single form definition
 *   PUT    /api/form-definitions/:id    — Update a form definition
 *   DELETE /api/form-definitions/:id    — Soft-delete (archive) a form definition
 */

import type { ServerResponse } from 'http';
import { z } from 'zod';
import { query } from '../utils/db';
import { validate } from '../utils/validators';
import type { AuthenticatedRequest } from '../utils/request-context';

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const validCategories = ['toolbox', 'ptw', 'inspection', 'equipment', 'action'] as const;

const createFormDefinitionSchema = z.object({
  tenantId: z.string().uuid('tenantId must be a valid UUID'),
  name: z.string().min(1, 'name is required'),
  slug: z.string().min(1, 'slug is required'),
  category: z.enum(validCategories, {
    errorMap: () => ({ message: `category must be one of: ${validCategories.join(', ')}` }),
  }),
  description: z.string().optional().default(''),
  schema_jsonb: z.record(z.any()).optional().default({}),
  ui_schema_jsonb: z.record(z.any()).optional().default({}),
});

const updateFormDefinitionSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  category: z.enum(validCategories).optional(),
  description: z.string().optional(),
  schema_jsonb: z.record(z.any()).optional(),
  ui_schema_jsonb: z.record(z.any()).optional(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sendJson(res: ServerResponse, statusCode: number, data: unknown): void {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

/**
 * GET /api/form-definitions?tenantId={tenantId}&category={category}
 *
 * Lists all form definitions for a tenant. Optional ?category filter.
 */
export async function handleListFormDefinitions(
  req: AuthenticatedRequest,
  res: ServerResponse,
): Promise<void> {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const tenantId = url.searchParams.get('tenantId');
    const category = url.searchParams.get('category');

    if (!tenantId) {
      sendJson(res, 400, { error: 'Bad Request', message: 'tenantId query parameter is required' });
      return;
    }

    let sql = 'SELECT * FROM form_definitions WHERE tenant_id = $1';
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (category) {
      sql += ` AND category = $${paramIndex++}`;
      params.push(category);
    }

    sql += ` AND status != 'archived' ORDER BY created_at DESC`;

    const result = await query(sql, params);

    sendJson(res, 200, { data: result.rows, total: result.rowCount });
  } catch (err: any) {
    console.error('[FormDefinitions] List error:', err);
    sendJson(res, 500, { error: 'Internal Server Error', message: err.message });
  }
}

/**
 * POST /api/form-definitions
 *
 * Creates a new form definition. Slug must be unique per tenant.
 */
export async function handleCreateFormDefinition(
  req: AuthenticatedRequest,
  res: ServerResponse,
  body: unknown,
): Promise<void> {
  try {
    const validation = validate(body, createFormDefinitionSchema);
    if (!validation.success) {
      sendJson(res, 400, { error: 'Validation Error', message: validation.errors.join('; ') });
      return;
    }

    const { tenantId, name, slug, category, description, schema_jsonb, ui_schema_jsonb } =
      validation.data;

    // Check slug uniqueness within tenant
    const slugCheck = await query(
      'SELECT id FROM form_definitions WHERE tenant_id = $1 AND slug = $2',
      [tenantId, slug],
    );
    if (slugCheck.rows.length > 0) {
      sendJson(res, 409, {
        error: 'Conflict',
        message: `A form definition with slug "${slug}" already exists in this tenant`,
      });
      return;
    }

    const result = await query(
      `INSERT INTO form_definitions (tenant_id, name, slug, category, description, schema_jsonb, ui_schema_jsonb)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [tenantId, name, slug, category, description, JSON.stringify(schema_jsonb), JSON.stringify(ui_schema_jsonb)],
    );

    sendJson(res, 201, result.rows[0]);
  } catch (err: any) {
    console.error('[FormDefinitions] Create error:', err);
    sendJson(res, 500, { error: 'Internal Server Error', message: err.message });
  }
}

/**
 * GET /api/form-definitions/:id
 *
 * Returns a single form definition by ID, scoped to the tenant.
 */
export async function handleGetFormDefinition(
  req: AuthenticatedRequest,
  res: ServerResponse,
  _body?: unknown,
  id?: string,
): Promise<void> {
  try {
    if (!id) {
      sendJson(res, 400, { error: 'Bad Request', message: 'Form definition ID is required' });
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const tenantId = url.searchParams.get('tenantId') || req.auth?.tenantId;

    let sql = 'SELECT * FROM form_definitions WHERE id = $1';
    const params: any[] = [id];

    if (tenantId) {
      sql += ' AND tenant_id = $2';
      params.push(tenantId);
    }

    const result = await query(sql, params);

    if (result.rows.length === 0) {
      sendJson(res, 404, { error: 'Not Found', message: 'Form definition not found' });
      return;
    }

    sendJson(res, 200, result.rows[0]);
  } catch (err: any) {
    console.error('[FormDefinitions] Get error:', err);
    sendJson(res, 500, { error: 'Internal Server Error', message: err.message });
  }
}

/**
 * PUT /api/form-definitions/:id
 *
 * Updates a form definition. Increments the version on every update.
 */
export async function handleUpdateFormDefinition(
  req: AuthenticatedRequest,
  res: ServerResponse,
  body: unknown,
  id?: string,
): Promise<void> {
  try {
    if (!id) {
      sendJson(res, 400, { error: 'Bad Request', message: 'Form definition ID is required' });
      return;
    }

    const validation = validate(body, updateFormDefinitionSchema);
    if (!validation.success) {
      sendJson(res, 400, { error: 'Validation Error', message: validation.errors.join('; ') });
      return;
    }

    const fields = validation.data;
    const setClauses: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        // Map camelCase body keys to snake_case columns
        const column = key.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase());
        setClauses.push(`${column} = $${paramIndex++}`);
        params.push(typeof value === 'object' && value !== null ? JSON.stringify(value) : value);
      }
    }

    if (setClauses.length === 0) {
      sendJson(res, 400, { error: 'Bad Request', message: 'No fields provided for update' });
      return;
    }

    // Always increment version and update updated_at
    setClauses.push(`version = version + 1`);
    setClauses.push(`updated_at = NOW()`);

    params.push(id);
    const sql = `UPDATE form_definitions SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

    const result = await query(sql, params);

    if (result.rows.length === 0) {
      sendJson(res, 404, { error: 'Not Found', message: 'Form definition not found' });
      return;
    }

    sendJson(res, 200, result.rows[0]);
  } catch (err: any) {
    console.error('[FormDefinitions] Update error:', err);
    sendJson(res, 500, { error: 'Internal Server Error', message: err.message });
  }
}

/**
 * DELETE /api/form-definitions/:id
 *
 * Soft-deletes a form definition by setting its status to 'archived'.
 */
export async function handleDeleteFormDefinition(
  req: AuthenticatedRequest,
  res: ServerResponse,
  _body?: unknown,
  id?: string,
): Promise<void> {
  try {
    if (!id) {
      sendJson(res, 400, { error: 'Bad Request', message: 'Form definition ID is required' });
      return;
    }

    const result = await query(
      `UPDATE form_definitions SET status = 'archived', updated_at = NOW() WHERE id = $1 RETURNING id`,
      [id],
    );

    if (result.rows.length === 0) {
      sendJson(res, 404, { error: 'Not Found', message: 'Form definition not found' });
      return;
    }

    sendJson(res, 200, { success: true });
  } catch (err: any) {
    console.error('[FormDefinitions] Delete error:', err);
    sendJson(res, 500, { error: 'Internal Server Error', message: err.message });
  }
}
