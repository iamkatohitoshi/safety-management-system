/**
 * Form Submissions CRUD route handlers.
 *
 * Endpoints:
 *   GET    /api/form-submissions            — List submissions for a tenant
 *   POST   /api/form-submissions            — Create a new form submission
 *   GET    /api/form-submissions/:id        — Get a single submission
 *   PUT    /api/form-submissions/:id        — Update a submission (only if draft)
 *   DELETE /api/form-submissions/:id        — Delete a submission
 */

import type { ServerResponse } from 'http';
import { z } from 'zod';
import { query } from '../utils/db';
import { validate } from '../utils/validators';
import type { AuthenticatedRequest } from '../utils/request-context';

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const createFormSubmissionSchema = z.object({
  tenantId: z.string().uuid('tenantId must be a valid UUID'),
  formDefinitionId: z.string().uuid('formDefinitionId must be a valid UUID'),
  workflowDefinitionId: z.string().uuid().optional().nullable(),
  data_jsonb: z.record(z.any()).optional().default({}),
  submittedBy: z.string().uuid('submittedBy must be a valid UUID'),
});

const updateFormSubmissionSchema = z.object({
  data_jsonb: z.record(z.any()).optional(),
  status: z.enum(['draft', 'submitted', 'in_review', 'approved', 'rejected', 'revision_requested']).optional(),
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
 * GET /api/form-submissions?tenantId={tenantId}&status={status}&formDefinitionId={id}&submittedBy={id}
 *
 * Lists form submissions for a tenant with optional filters.
 * Joins with form_definitions and users to include form name and submitter name.
 */
export async function handleListFormSubmissions(
  req: AuthenticatedRequest,
  res: ServerResponse,
): Promise<void> {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const tenantId = url.searchParams.get('tenantId');
    const status = url.searchParams.get('status');
    const formDefinitionId = url.searchParams.get('formDefinitionId');
    const submittedBy = url.searchParams.get('submittedBy');

    if (!tenantId) {
      sendJson(res, 400, { error: 'Bad Request', message: 'tenantId query parameter is required' });
      return;
    }

    let sql = `
      SELECT fs.*, fd.name AS form_name, u.name AS submitter_name
      FROM form_submissions fs
      LEFT JOIN form_definitions fd ON fd.id = fs.form_definition_id
      LEFT JOIN users u ON u.id = fs.submitted_by
      WHERE fs.tenant_id = $1
    `;
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (status) {
      sql += ` AND fs.status = $${paramIndex++}`;
      params.push(status);
    }

    if (formDefinitionId) {
      sql += ` AND fs.form_definition_id = $${paramIndex++}`;
      params.push(formDefinitionId);
    }

    if (submittedBy) {
      sql += ` AND fs.submitted_by = $${paramIndex++}`;
      params.push(submittedBy);
    }

    sql += ' ORDER BY fs.created_at DESC';

    const result = await query(sql, params);

    sendJson(res, 200, { data: result.rows, total: result.rowCount });
  } catch (err: any) {
    console.error('[FormSubmissions] List error:', err);
    sendJson(res, 500, { error: 'Internal Server Error', message: err.message });
  }
}

/**
 * POST /api/form-submissions
 *
 * Creates a new form submission.
 * - If workflowDefinitionId is provided, status starts as 'draft' with current_step = 0.
 * - If no workflow, status is set to 'submitted' directly.
 */
export async function handleCreateFormSubmission(
  req: AuthenticatedRequest,
  res: ServerResponse,
  body: unknown,
): Promise<void> {
  try {
    const validation = validate(body, createFormSubmissionSchema);
    if (!validation.success) {
      sendJson(res, 400, { error: 'Validation Error', message: validation.errors.join('; ') });
      return;
    }

    const { tenantId, formDefinitionId, workflowDefinitionId, data_jsonb, submittedBy } =
      validation.data;

    // Verify form definition exists and is active
    const formCheck = await query(
      "SELECT id FROM form_definitions WHERE id = $1 AND tenant_id = $2 AND status = 'active'",
      [formDefinitionId, tenantId],
    );
    if (formCheck.rows.length === 0) {
      sendJson(res, 400, {
        error: 'Bad Request',
        message: `Form definition with id "${formDefinitionId}" not found or is not active in this tenant`,
      });
      return;
    }

    // If a workflow is specified, verify it exists
    if (workflowDefinitionId) {
      const wfCheck = await query(
        'SELECT id FROM workflow_definitions WHERE id = $1 AND tenant_id = $2',
        [workflowDefinitionId, tenantId],
      );
      if (wfCheck.rows.length === 0) {
        sendJson(res, 400, {
          error: 'Bad Request',
          message: `Workflow definition with id "${workflowDefinitionId}" not found in this tenant`,
        });
        return;
      }
    }

    const hasWorkflow = !!workflowDefinitionId;
    const status = hasWorkflow ? 'draft' : 'submitted';
    const currentStep = hasWorkflow ? 0 : null;
    const submittedAt = hasWorkflow ? null : new Date().toISOString();

    const result = await query(
      `INSERT INTO form_submissions (tenant_id, form_definition_id, workflow_definition_id, data_jsonb, status, current_step, submitted_by, submitted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        tenantId,
        formDefinitionId,
        workflowDefinitionId || null,
        JSON.stringify(data_jsonb),
        status,
        currentStep,
        submittedBy,
        submittedAt,
      ],
    );

    sendJson(res, 201, result.rows[0]);
  } catch (err: any) {
    console.error('[FormSubmissions] Create error:', err);
    sendJson(res, 500, { error: 'Internal Server Error', message: err.message });
  }
}

/**
 * GET /api/form-submissions/:id
 *
 * Returns a single form submission with joined form name and submitter info.
 */
export async function handleGetFormSubmission(
  req: AuthenticatedRequest,
  res: ServerResponse,
  _body?: unknown,
  id?: string,
): Promise<void> {
  try {
    if (!id) {
      sendJson(res, 400, { error: 'Bad Request', message: 'Submission ID is required' });
      return;
    }

    const result = await query(
      `SELECT fs.*, fd.name AS form_name, u.name AS submitter_name
       FROM form_submissions fs
       LEFT JOIN form_definitions fd ON fd.id = fs.form_definition_id
       LEFT JOIN users u ON u.id = fs.submitted_by
       WHERE fs.id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      sendJson(res, 404, { error: 'Not Found', message: 'Form submission not found' });
      return;
    }

    sendJson(res, 200, result.rows[0]);
  } catch (err: any) {
    console.error('[FormSubmissions] Get error:', err);
    sendJson(res, 500, { error: 'Internal Server Error', message: err.message });
  }
}

/**
 * PUT /api/form-submissions/:id
 *
 * Updates a form submission's data_jsonb and/or status.
 * Only allows updates if the status is 'draft'.
 */
export async function handleUpdateFormSubmission(
  req: AuthenticatedRequest,
  res: ServerResponse,
  body: unknown,
  id?: string,
): Promise<void> {
  try {
    if (!id) {
      sendJson(res, 400, { error: 'Bad Request', message: 'Submission ID is required' });
      return;
    }

    const validation = validate(body, updateFormSubmissionSchema);
    if (!validation.success) {
      sendJson(res, 400, { error: 'Validation Error', message: validation.errors.join('; ') });
      return;
    }

    // Check current status — only allow updates for drafts
    const existing = await query(
      'SELECT id, status FROM form_submissions WHERE id = $1',
      [id],
    );
    if (existing.rows.length === 0) {
      sendJson(res, 404, { error: 'Not Found', message: 'Form submission not found' });
      return;
    }

    if (existing.rows[0].status !== 'draft') {
      sendJson(res, 403, {
        error: 'Forbidden',
        message: 'Cannot update a submission that is not in draft status',
      });
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
    const sql = `UPDATE form_submissions SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

    const result = await query(sql, params);

    sendJson(res, 200, result.rows[0]);
  } catch (err: any) {
    console.error('[FormSubmissions] Update error:', err);
    sendJson(res, 500, { error: 'Internal Server Error', message: err.message });
  }
}

/**
 * DELETE /api/form-submissions/:id
 *
 * Deletes a form submission permanently (hard delete).
 */
export async function handleDeleteFormSubmission(
  req: AuthenticatedRequest,
  res: ServerResponse,
  _body?: unknown,
  id?: string,
): Promise<void> {
  try {
    if (!id) {
      sendJson(res, 400, { error: 'Bad Request', message: 'Submission ID is required' });
      return;
    }

    const result = await query(
      'DELETE FROM form_submissions WHERE id = $1 RETURNING id',
      [id],
    );

    if (result.rows.length === 0) {
      sendJson(res, 404, { error: 'Not Found', message: 'Form submission not found' });
      return;
    }

    sendJson(res, 200, { success: true });
  } catch (err: any) {
    console.error('[FormSubmissions] Delete error:', err);
    sendJson(res, 500, { error: 'Internal Server Error', message: err.message });
  }
}
