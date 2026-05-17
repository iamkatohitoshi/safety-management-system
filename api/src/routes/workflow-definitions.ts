/**
 * Workflow Definitions CRUD route handlers.
 *
 * Endpoints:
 *   GET    /api/workflow-definitions          — List workflow definitions for a tenant
 *   POST   /api/workflow-definitions          — Create a new workflow definition
 *   GET    /api/workflow-definitions/:id      — Get a single workflow definition
 *   PUT    /api/workflow-definitions/:id      — Update a workflow definition
 *   DELETE /api/workflow-definitions/:id      — Delete a workflow definition
 */

import type { ServerResponse } from 'http';
import { z } from 'zod';
import { query } from '../utils/db';
import { validate } from '../utils/validators';
import type { AuthenticatedRequest } from '../utils/request-context';

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const workflowStepSchema = z.object({
  step_order: z.number().int().positive('step_order must be a positive integer'),
  name: z.string().min(1, 'step name is required'),
  assignee_role: z.string().min(1, 'assignee_role is required'),
  type: z.enum(['sequential', 'parallel']),
  description: z.string().optional(),
  required_approvals: z.number().int().positive().optional(),
});

const createWorkflowDefinitionSchema = z.object({
  tenantId: z.string().uuid('tenantId must be a valid UUID'),
  name: z.string().min(1, 'name is required'),
  description: z.string().optional().default(''),
  formDefinitionId: z.string().uuid('formDefinitionId must be a valid UUID'),
  steps_jsonb: z.array(workflowStepSchema).min(1, 'at least one step is required'),
  isActive: z.boolean().optional().default(true),
});

const updateWorkflowDefinitionSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  formDefinitionId: z.string().uuid().optional(),
  steps_jsonb: z.array(workflowStepSchema).min(1).optional(),
  isActive: z.boolean().optional(),
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
 * GET /api/workflow-definitions?tenantId={tenantId}&formDefinitionId={id}
 *
 * Lists all workflow definitions for a tenant. Optional ?formDefinitionId filter.
 */
export async function handleListWorkflowDefinitions(
  req: AuthenticatedRequest,
  res: ServerResponse,
): Promise<void> {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const tenantId = url.searchParams.get('tenantId');
    const formDefinitionId = url.searchParams.get('formDefinitionId');

    if (!tenantId) {
      sendJson(res, 400, { error: 'Bad Request', message: 'tenantId query parameter is required' });
      return;
    }

    let sql = 'SELECT * FROM workflow_definitions WHERE tenant_id = $1';
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (formDefinitionId) {
      sql += ` AND form_definition_id = $${paramIndex++}`;
      params.push(formDefinitionId);
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);

    sendJson(res, 200, { data: result.rows, total: result.rowCount });
  } catch (err: any) {
    console.error('[WorkflowDefinitions] List error:', err);
    sendJson(res, 500, { error: 'Internal Server Error', message: err.message });
  }
}

/**
 * POST /api/workflow-definitions
 *
 * Creates a new workflow definition.
 */
export async function handleCreateWorkflowDefinition(
  req: AuthenticatedRequest,
  res: ServerResponse,
  body: unknown,
): Promise<void> {
  try {
    const validation = validate(body, createWorkflowDefinitionSchema);
    if (!validation.success) {
      sendJson(res, 400, { error: 'Validation Error', message: validation.errors.join('; ') });
      return;
    }

    const { tenantId, name, description, formDefinitionId, steps_jsonb, isActive } =
      validation.data;

    // Verify the linked form definition exists
    const formCheck = await query(
      'SELECT id FROM form_definitions WHERE id = $1 AND tenant_id = $2',
      [formDefinitionId, tenantId],
    );
    if (formCheck.rows.length === 0) {
      sendJson(res, 400, {
        error: 'Bad Request',
        message: `Form definition with id "${formDefinitionId}" not found in this tenant`,
      });
      return;
    }

    const result = await query(
      `INSERT INTO workflow_definitions (tenant_id, name, description, form_definition_id, steps_jsonb, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [tenantId, name, description, formDefinitionId, JSON.stringify(steps_jsonb), isActive],
    );

    sendJson(res, 201, result.rows[0]);
  } catch (err: any) {
    console.error('[WorkflowDefinitions] Create error:', err);
    sendJson(res, 500, { error: 'Internal Server Error', message: err.message });
  }
}

/**
 * GET /api/workflow-definitions/:id
 *
 * Returns a single workflow definition by ID.
 */
export async function handleGetWorkflowDefinition(
  req: AuthenticatedRequest,
  res: ServerResponse,
  _body?: unknown,
  id?: string,
): Promise<void> {
  try {
    if (!id) {
      sendJson(res, 400, { error: 'Bad Request', message: 'Workflow definition ID is required' });
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const tenantId = url.searchParams.get('tenantId') || req.auth?.tenantId;

    let sql = 'SELECT * FROM workflow_definitions WHERE id = $1';
    const params: any[] = [id];

    if (tenantId) {
      sql += ' AND tenant_id = $2';
      params.push(tenantId);
    }

    const result = await query(sql, params);

    if (result.rows.length === 0) {
      sendJson(res, 404, { error: 'Not Found', message: 'Workflow definition not found' });
      return;
    }

    sendJson(res, 200, result.rows[0]);
  } catch (err: any) {
    console.error('[WorkflowDefinitions] Get error:', err);
    sendJson(res, 500, { error: 'Internal Server Error', message: err.message });
  }
}

/**
 * PUT /api/workflow-definitions/:id
 *
 * Updates a workflow definition.
 */
export async function handleUpdateWorkflowDefinition(
  req: AuthenticatedRequest,
  res: ServerResponse,
  body: unknown,
  id?: string,
): Promise<void> {
  try {
    if (!id) {
      sendJson(res, 400, { error: 'Bad Request', message: 'Workflow definition ID is required' });
      return;
    }

    const validation = validate(body, updateWorkflowDefinitionSchema);
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
        const column = key.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase());
        setClauses.push(`${column} = $${paramIndex++}`);
        params.push(typeof value === 'object' && value !== null ? JSON.stringify(value) : value);
      }
    }

    if (setClauses.length === 0) {
      sendJson(res, 400, { error: 'Bad Request', message: 'No fields provided for update' });
      return;
    }

    setClauses.push('updated_at = NOW()');
    params.push(id);
    const sql = `UPDATE workflow_definitions SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

    const result = await query(sql, params);

    if (result.rows.length === 0) {
      sendJson(res, 404, { error: 'Not Found', message: 'Workflow definition not found' });
      return;
    }

    sendJson(res, 200, result.rows[0]);
  } catch (err: any) {
    console.error('[WorkflowDefinitions] Update error:', err);
    sendJson(res, 500, { error: 'Internal Server Error', message: err.message });
  }
}

/**
 * DELETE /api/workflow-definitions/:id
 *
 * Deletes a workflow definition permanently.
 */
export async function handleDeleteWorkflowDefinition(
  req: AuthenticatedRequest,
  res: ServerResponse,
  _body?: unknown,
  id?: string,
): Promise<void> {
  try {
    if (!id) {
      sendJson(res, 400, { error: 'Bad Request', message: 'Workflow definition ID is required' });
      return;
    }

    const result = await query(
      'DELETE FROM workflow_definitions WHERE id = $1 RETURNING id',
      [id],
    );

    if (result.rows.length === 0) {
      sendJson(res, 404, { error: 'Not Found', message: 'Workflow definition not found' });
      return;
    }

    sendJson(res, 200, { success: true });
  } catch (err: any) {
    console.error('[WorkflowDefinitions] Delete error:', err);
    sendJson(res, 500, { error: 'Internal Server Error', message: err.message });
  }
}
