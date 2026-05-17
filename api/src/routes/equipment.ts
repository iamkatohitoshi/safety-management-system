/**
 * Equipment CRUD route handlers.
 *
 * Endpoints:
 *   GET    /api/equipment             — List equipment for a tenant
 *   POST   /api/equipment             — Create a new equipment record
 *   GET    /api/equipment/:id         — Get a single equipment record
 *   PUT    /api/equipment/:id         — Update an equipment record
 *   DELETE /api/equipment/:id         — Delete an equipment record
 */

import type { ServerResponse } from 'http';
import { z } from 'zod';
import { query } from '../utils/db';
import { validate } from '../utils/validators';
import type { AuthenticatedRequest } from '../utils/request-context';

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const createEquipmentSchema = z.object({
  tenantId: z.string().uuid('tenantId must be a valid UUID'),
  name: z.string().min(1, 'name is required'),
  serialNumber: z.string().optional().nullable().default(null),
  certExpiryDate: z.string().optional().nullable().default(null),
  formDataJsonb: z.record(z.any()).optional().default({}),
});

const updateEquipmentSchema = z.object({
  name: z.string().min(1).optional(),
  serialNumber: z.string().optional().nullable(),
  certExpiryDate: z.string().optional().nullable(),
  status: z.string().optional(),
  formDataJsonb: z.record(z.any()).optional(),
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
 * GET /api/equipment?tenantId={tenantId}&status={status}&certExpiringWithin={days}
 *
 * Lists equipment for a tenant with optional filters.
 * - ?status: filter by status (e.g. 'active', 'inactive')
 * - ?certExpiringWithin: return items where cert_expiry_date <= NOW() + interval (in days)
 */
export async function handleListEquipment(
  req: AuthenticatedRequest,
  res: ServerResponse,
): Promise<void> {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const tenantId = url.searchParams.get('tenantId');
    const status = url.searchParams.get('status');
    const certExpiringWithin = url.searchParams.get('certExpiringWithin');

    if (!tenantId) {
      sendJson(res, 400, { error: 'Bad Request', message: 'tenantId query parameter is required' });
      return;
    }

    let sql = 'SELECT * FROM equipment WHERE tenant_id = $1';
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (status) {
      sql += ` AND status = $${paramIndex++}`;
      params.push(status);
    }

    if (certExpiringWithin) {
      const days = parseInt(certExpiringWithin, 10);
      if (isNaN(days) || days < 0) {
        sendJson(res, 400, {
          error: 'Bad Request',
          message: 'certExpiringWithin must be a non-negative integer',
        });
        return;
      }
      sql += ` AND cert_expiry_date IS NOT NULL AND cert_expiry_date <= NOW() + INTERVAL '${days} days'`;
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);

    sendJson(res, 200, { data: result.rows, total: result.rowCount });
  } catch (err: any) {
    console.error('[Equipment] List error:', err);
    sendJson(res, 500, { error: 'Internal Server Error', message: err.message });
  }
}

/**
 * POST /api/equipment
 *
 * Creates a new equipment record.
 */
export async function handleCreateEquipment(
  req: AuthenticatedRequest,
  res: ServerResponse,
  body: unknown,
): Promise<void> {
  try {
    const validation = validate(body, createEquipmentSchema);
    if (!validation.success) {
      sendJson(res, 400, { error: 'Validation Error', message: validation.errors.join('; ') });
      return;
    }

    const { tenantId, name, serialNumber, certExpiryDate, formDataJsonb } = validation.data;

    const result = await query(
      `INSERT INTO equipment (tenant_id, name, serial_number, cert_expiry_date, form_data_jsonb)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [tenantId, name, serialNumber, certExpiryDate, JSON.stringify(formDataJsonb)],
    );

    sendJson(res, 201, result.rows[0]);
  } catch (err: any) {
    console.error('[Equipment] Create error:', err);
    sendJson(res, 500, { error: 'Internal Server Error', message: err.message });
  }
}

/**
 * GET /api/equipment/:id
 *
 * Returns a single equipment record by ID.
 */
export async function handleGetEquipment(
  req: AuthenticatedRequest,
  res: ServerResponse,
  _body?: unknown,
  id?: string,
): Promise<void> {
  try {
    if (!id) {
      sendJson(res, 400, { error: 'Bad Request', message: 'Equipment ID is required' });
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const tenantId = url.searchParams.get('tenantId') || req.auth?.tenantId;

    let sql = 'SELECT * FROM equipment WHERE id = $1';
    const params: any[] = [id];

    if (tenantId) {
      sql += ' AND tenant_id = $2';
      params.push(tenantId);
    }

    const result = await query(sql, params);

    if (result.rows.length === 0) {
      sendJson(res, 404, { error: 'Not Found', message: 'Equipment not found' });
      return;
    }

    sendJson(res, 200, result.rows[0]);
  } catch (err: any) {
    console.error('[Equipment] Get error:', err);
    sendJson(res, 500, { error: 'Internal Server Error', message: err.message });
  }
}

/**
 * PUT /api/equipment/:id
 *
 * Updates an equipment record.
 */
export async function handleUpdateEquipment(
  req: AuthenticatedRequest,
  res: ServerResponse,
  body: unknown,
  id?: string,
): Promise<void> {
  try {
    if (!id) {
      sendJson(res, 400, { error: 'Bad Request', message: 'Equipment ID is required' });
      return;
    }

    const validation = validate(body, updateEquipmentSchema);
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
    const sql = `UPDATE equipment SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

    const result = await query(sql, params);

    if (result.rows.length === 0) {
      sendJson(res, 404, { error: 'Not Found', message: 'Equipment not found' });
      return;
    }

    sendJson(res, 200, result.rows[0]);
  } catch (err: any) {
    console.error('[Equipment] Update error:', err);
    sendJson(res, 500, { error: 'Internal Server Error', message: err.message });
  }
}

/**
 * DELETE /api/equipment/:id
 *
 * Deletes an equipment record permanently.
 */
export async function handleDeleteEquipment(
  req: AuthenticatedRequest,
  res: ServerResponse,
  _body?: unknown,
  id?: string,
): Promise<void> {
  try {
    if (!id) {
      sendJson(res, 400, { error: 'Bad Request', message: 'Equipment ID is required' });
      return;
    }

    const result = await query(
      'DELETE FROM equipment WHERE id = $1 RETURNING id',
      [id],
    );

    if (result.rows.length === 0) {
      sendJson(res, 404, { error: 'Not Found', message: 'Equipment not found' });
      return;
    }

    sendJson(res, 200, { success: true });
  } catch (err: any) {
    console.error('[Equipment] Delete error:', err);
    sendJson(res, 500, { error: 'Internal Server Error', message: err.message });
  }
}
