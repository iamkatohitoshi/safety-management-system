/**
 * Approvals (Approval Actions) route handlers.
 *
 * Endpoints:
 *   GET  /api/approvals             — List approval actions for a tenant
 *   POST /api/approvals             — Create an approval action and update submission status
 */

import type { ServerResponse } from 'http';
import { z } from 'zod';
import { query, transaction } from '../utils/db';
import { validate } from '../utils/validators';
import type { AuthenticatedRequest } from '../utils/request-context';
import { getNextStep, isWorkflowComplete } from '../services/workflow-engine';

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const createApprovalSchema = z.object({
  tenantId: z.string().uuid('tenantId must be a valid UUID'),
  submissionId: z.string().uuid('submissionId must be a valid UUID'),
  stepOrder: z.number().int().positive('stepOrder must be a positive integer'),
  action: z.enum(['approve', 'reject', 'request_revision'], {
    errorMap: () => ({ message: "action must be one of: 'approve', 'reject', 'request_revision'" }),
  }),
  comment: z.string().optional().default(''),
  actionedBy: z.string().uuid('actionedBy must be a valid UUID'),
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
 * GET /api/approvals?tenantId={tenantId}&submissionId={id}
 *
 * Lists approval actions for a tenant. Optional ?submissionId filter.
 * Joins with users and form_submissions for context.
 */
export async function handleListApprovals(
  req: AuthenticatedRequest,
  res: ServerResponse,
): Promise<void> {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const tenantId = url.searchParams.get('tenantId');
    const submissionId = url.searchParams.get('submissionId');

    if (!tenantId) {
      sendJson(res, 400, { error: 'Bad Request', message: 'tenantId query parameter is required' });
      return;
    }

    let sql = `
      SELECT aa.*, u.name AS actioned_by_name,
             fs.status AS submission_status, fs.form_definition_id
      FROM approval_actions aa
      LEFT JOIN users u ON u.id = aa.actioned_by
      LEFT JOIN form_submissions fs ON fs.id = aa.submission_id
      WHERE aa.tenant_id = $1
    `;
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (submissionId) {
      sql += ` AND aa.submission_id = $${paramIndex++}`;
      params.push(submissionId);
    }

    sql += ' ORDER BY aa.created_at DESC';

    const result = await query(sql, params);

    sendJson(res, 200, { data: result.rows, total: result.rowCount });
  } catch (err: any) {
    console.error('[Approvals] List error:', err);
    sendJson(res, 500, { error: 'Internal Server Error', message: err.message });
  }
}

/**
 * POST /api/approvals
 *
 * Creates a new approval action and updates the associated submission status.
 *
 * Approval action -> Submission status transition:
 *   'approve'         -> advance current_step; if final step, status='approved'
 *   'reject'          -> status='rejected'
 *   'request_revision' -> status='revision_requested'
 *
 * Uses a database transaction to keep the approval action and submission update
 * consistent.
 */
export async function handleCreateApproval(
  req: AuthenticatedRequest,
  res: ServerResponse,
  body: unknown,
): Promise<void> {
  try {
    const validation = validate(body, createApprovalSchema);
    if (!validation.success) {
      sendJson(res, 400, { error: 'Validation Error', message: validation.errors.join('; ') });
      return;
    }

    const { tenantId, submissionId, stepOrder, action, comment, actionedBy } = validation.data;

    // Execute as a transaction so approval action and submission update are atomic
    const result = await transaction(async (client) => {
      // 1. Fetch the submission
      const subResult = await client.query(
        `SELECT fs.*, wd.steps_jsonb
         FROM form_submissions fs
         LEFT JOIN workflow_definitions wd ON wd.id = fs.workflow_definition_id
         WHERE fs.id = $1 AND fs.tenant_id = $2`,
        [submissionId, tenantId],
      );

      if (subResult.rows.length === 0) {
        throw { statusCode: 404, message: 'Form submission not found' };
      }

      const submission = subResult.rows[0];

      // 2. Validate step order matches current step
      if (submission.current_step !== stepOrder) {
        throw {
          statusCode: 400,
          message: `Invalid step order. Expected step ${submission.current_step}, got ${stepOrder}`,
        };
      }

      // 3. Insert the approval action
      const approvalResult = await client.query(
        `INSERT INTO approval_actions (tenant_id, submission_id, step_order, action, comment, actioned_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [tenantId, submissionId, stepOrder, action, comment, actionedBy],
      );

      // 4. Update the submission based on the action
      let newStatus: string;
      let newCurrentStep: number | null;

      const steps = submission.steps_jsonb || [];

      switch (action) {
        case 'approve': {
          const nextStep = getNextStep(stepOrder, 'approve', steps);
          if (nextStep === null || isWorkflowComplete(nextStep, steps)) {
            newStatus = 'approved';
            newCurrentStep = nextStep; // step beyond the max
          } else {
            newStatus = 'in_review';
            newCurrentStep = nextStep;
          }
          break;
        }

        case 'reject': {
          newStatus = 'rejected';
          const nextStep = getNextStep(stepOrder, 'reject', steps);
          newCurrentStep = nextStep; // reset to step 1
          break;
        }

        case 'request_revision': {
          newStatus = 'revision_requested';
          const nextStep = getNextStep(stepOrder, 'request_revision', steps);
          newCurrentStep = nextStep;
          break;
        }

        default:
          throw { statusCode: 400, message: `Unsupported action: ${action}` };
      }

      const updateResult = await client.query(
        `UPDATE form_submissions
         SET status = $1, current_step = $2, updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [newStatus, newCurrentStep, submissionId],
      );

      return {
        approval: approvalResult.rows[0],
        submission: updateResult.rows[0],
      };
    });

    sendJson(res, 201, result);
  } catch (err: any) {
    if (err.statusCode) {
      sendJson(res, err.statusCode, { error: 'Bad Request', message: err.message });
    } else {
      console.error('[Approvals] Create error:', err);
      sendJson(res, 500, { error: 'Internal Server Error', message: err.message });
    }
  }
}
