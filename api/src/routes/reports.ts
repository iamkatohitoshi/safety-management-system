/**
 * Reports route handlers.
 *
 * Endpoints:
 *   GET /api/reports/summary  — Tenant-wide summary statistics
 *   GET /api/reports/by-form  — Per-form submission breakdown
 */

import type { ServerResponse } from 'http';
import { query } from '../utils/db';
import type { AuthenticatedRequest } from '../utils/request-context';

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
 * GET /api/reports/summary?tenantId={tenantId}
 *
 * Returns tenant-wide summary statistics:
 *   - totalSubmissions
 *   - byStatus: breakdown of submissions by status
 *   - byCategory: breakdown of form definitions by category
 *   - totalEquipment: total equipment count
 *   - expiringEquipment: equipment whose cert expires within the next 30 days
 */
export async function handleSummaryReport(
  req: AuthenticatedRequest,
  res: ServerResponse,
): Promise<void> {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const tenantId = url.searchParams.get('tenantId');

    if (!tenantId) {
      sendJson(res, 400, { error: 'Bad Request', message: 'tenantId query parameter is required' });
      return;
    }

    // Total submissions
    const totalSubResult = await query(
      'SELECT COUNT(*)::int AS count FROM form_submissions WHERE tenant_id = $1',
      [tenantId],
    );
    const totalSubmissions = totalSubResult.rows[0]?.count ?? 0;

    // Submissions by status
    const byStatusResult = await query(
      `SELECT status, COUNT(*)::int AS count
       FROM form_submissions
       WHERE tenant_id = $1
       GROUP BY status
       ORDER BY status`,
      [tenantId],
    );
    const byStatus: Record<string, number> = {};
    for (const row of byStatusResult.rows) {
      byStatus[row.status] = row.count;
    }
    // Ensure all statuses are represented
    for (const s of ['draft', 'submitted', 'in_review', 'approved', 'rejected', 'revision_requested']) {
      if (!(s in byStatus)) {
        byStatus[s] = 0;
      }
    }

    // Submissions by form category
    const byCategoryResult = await query(
      `SELECT fd.category, COUNT(*)::int AS count
       FROM form_submissions fs
       JOIN form_definitions fd ON fd.id = fs.form_definition_id
       WHERE fs.tenant_id = $1
       GROUP BY fd.category
       ORDER BY fd.category`,
      [tenantId],
    );

    // Total equipment
    const totalEquipResult = await query(
      'SELECT COUNT(*)::int AS count FROM equipment WHERE tenant_id = $1',
      [tenantId],
    );
    const totalEquipment = totalEquipResult.rows[0]?.count ?? 0;

    // Equipment expiring within the next 30 days
    const expiringResult = await query(
      `SELECT COUNT(*)::int AS count
       FROM equipment
       WHERE tenant_id = $1
         AND cert_expiry_date IS NOT NULL
         AND cert_expiry_date BETWEEN NOW() AND NOW() + INTERVAL '30 days'`,
      [tenantId],
    );
    const expiringEquipment = expiringResult.rows[0]?.count ?? 0;

    sendJson(res, 200, {
      totalSubmissions,
      byStatus,
      byCategory: byCategoryResult.rows,
      totalEquipment,
      expiringEquipment,
    });
  } catch (err: any) {
    console.error('[Reports] Summary error:', err);
    sendJson(res, 500, { error: 'Internal Server Error', message: err.message });
  }
}

/**
 * GET /api/reports/by-form?tenantId={tenantId}&formDefinitionId={id}
 *
 * Returns submission statistics grouped by status for a specific form.
 * Also includes: total submissions, and average approval time (if approvals exist).
 */
export async function handleByFormReport(
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

    if (!formDefinitionId) {
      sendJson(res, 400, {
        error: 'Bad Request',
        message: 'formDefinitionId query parameter is required',
      });
      return;
    }

    // Total submissions for this form
    const totalResult = await query(
      `SELECT COUNT(*)::int AS count
       FROM form_submissions
       WHERE tenant_id = $1 AND form_definition_id = $2`,
      [tenantId, formDefinitionId],
    );
    const total = totalResult.rows[0]?.count ?? 0;

    // Submissions grouped by status
    const byStatusResult = await query(
      `SELECT status, COUNT(*)::int AS count
       FROM form_submissions
       WHERE tenant_id = $1 AND form_definition_id = $2
       GROUP BY status
       ORDER BY status`,
      [tenantId, formDefinitionId],
    );
    const byStatus: Record<string, number> = {};
    for (const row of byStatusResult.rows) {
      byStatus[row.status] = row.count;
    }

    // Average approval time: average time from submission to approval
    // Calculated as the difference between created_at of first approval action
    // and submitted_at of the submission, for approved submissions.
    const avgTimeResult = await query(
      `SELECT AVG(EXTRACT(EPOCH FROM (aa.created_at - fs.submitted_at)))::float AS avg_seconds
       FROM form_submissions fs
       JOIN approval_actions aa ON aa.submission_id = fs.id AND aa.action = 'approve'
       WHERE fs.tenant_id = $1 AND fs.form_definition_id = $2 AND fs.status = 'approved'
         AND fs.submitted_at IS NOT NULL`,
      [tenantId, formDefinitionId],
    );
    const avgApprovalTimeSeconds = avgTimeResult.rows[0]?.avg_seconds ?? null;

    // Human-readable average approval time
    let avgApprovalTime: string | null = null;
    if (avgApprovalTimeSeconds !== null) {
      const hrs = Math.floor(avgApprovalTimeSeconds / 3600);
      const mins = Math.floor((avgApprovalTimeSeconds % 3600) / 60);
      if (hrs > 0) {
        avgApprovalTime = `${hrs}h ${mins}m`;
      } else {
        avgApprovalTime = `${mins}m`;
      }
    }

    sendJson(res, 200, {
      total,
      byStatus,
      avgApprovalTime,
      avgApprovalTimeSeconds,
    });
  } catch (err: any) {
    console.error('[Reports] ByForm error:', err);
    sendJson(res, 500, { error: 'Internal Server Error', message: err.message });
  }
}
