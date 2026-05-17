/**
 * Vercel serverless function entry point.
 *
 * Vercel routes all /api/* requests to this single exported default handler.
 * It mirrors the routing logic from src/dev-server.ts but adapts to Vercel's
 * @vercel/node runtime (VercelRequest / VercelResponse).
 *
 * Key differences from dev-server.ts:
 *   - req.body is already parsed by Vercel (no need for manual JSON parsing)
 *   - req.query is already parsed by Vercel
 *   - VercelResponse extends ServerResponse, so .writeHead() / .end() work
 *   - No background server lifecycle (Vercel manages that)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Route handlers
import { handleLogin, handleRegister, handleMe } from './src/routes/auth';
import {
  handleListFormDefinitions,
  handleCreateFormDefinition,
  handleGetFormDefinition,
  handleUpdateFormDefinition,
  handleDeleteFormDefinition,
} from './src/routes/form-definitions';
import {
  handleListWorkflowDefinitions,
  handleCreateWorkflowDefinition,
  handleGetWorkflowDefinition,
  handleUpdateWorkflowDefinition,
  handleDeleteWorkflowDefinition,
} from './src/routes/workflow-definitions';
import {
  handleListFormSubmissions,
  handleCreateFormSubmission,
  handleGetFormSubmission,
  handleUpdateFormSubmission,
  handleDeleteFormSubmission,
} from './src/routes/form-submissions';
import { handleListApprovals, handleCreateApproval } from './src/routes/approvals';
import {
  handleListEquipment,
  handleCreateEquipment,
  handleGetEquipment,
  handleUpdateEquipment,
  handleDeleteEquipment,
} from './src/routes/equipment';
import { handleSummaryReport, handleByFormReport } from './src/routes/reports';

// Middleware
import { setCorsHeaders, handlePreflight } from './src/middleware/cors';
import { authenticateRequest } from './src/middleware/auth';
import { healthCheck } from './src/db/connection';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** JSON response helper (mirrors the one in each route file). */
function sendJson(res: VercelResponse, statusCode: number, data: unknown): void {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

/**
 * Match a URL pathname against a pattern with optional :id parameter.
 * Mirrors the function in dev-server.ts.
 */
function matchPath(
  pathname: string,
  pattern: string,
): { matched: boolean; id?: string } {
  const pathSegments = pathname.split('/').filter(Boolean);
  const patternSegments = pattern.split('/').filter(Boolean);

  if (pathSegments.length !== patternSegments.length) {
    return { matched: false };
  }

  let id: string | undefined;
  for (let i = 0; i < patternSegments.length; i++) {
    if (patternSegments[i] === ':id') {
      id = pathSegments[i];
    } else if (patternSegments[i] !== pathSegments[i]) {
      return { matched: false };
    }
  }

  return { matched: true, id };
}

/**
 * Require authentication. Sends 401 and returns false when not authenticated.
 * On success, sets `(req as any).auth` with the decoded user context so route
 * handlers (which expect AuthenticatedRequest from request-context.ts) can
 * access `req.auth`.
 */
async function requireAuth(req: VercelRequest, res: VercelResponse): Promise<boolean> {
  // authenticateRequest expects IncomingMessage-compatible object
  const ok = await authenticateRequest(req as any, res as any);
  if (!ok) {
    return false;
  }

  // Route handlers imported from src/routes/* use AuthenticatedRequest
  // from request-context.ts, which expects req.auth.
  const authReq = req as any;
  if (authReq.user) {
    authReq.auth = {
      userId: authReq.user.userId,
      tenantId: authReq.user.tenantId,
      role: authReq.user.role,
    };
  }
  return true;
}

// ---------------------------------------------------------------------------
// Vercel serverless handler
// ---------------------------------------------------------------------------

/**
 * Default export — Vercel calls this for every request to /api/*.
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Apply CORS headers to every response
  setCorsHeaders(res as any);

  // Handle CORS preflight (OPTIONS)
  if (handlePreflight(req as any, res as any)) {
    return;
  }

  // Build the full URL to parse pathname (same pattern as dev-server & routes)
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  try {
    // ------------------------------------------------------------------
    // GET /health
    // ------------------------------------------------------------------
    if (req.method === 'GET' && pathname === '/health') {
      const dbOk = await healthCheck();
      const statusCode = dbOk ? 200 : 503;
      sendJson(res, statusCode, {
        status: dbOk ? 'ok' : 'degraded',
        db: dbOk ? 'connected' : 'error',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // ------------------------------------------------------------------
    // Auth Routes  (/api/auth/*)
    // ------------------------------------------------------------------
    // POST /api/auth/login — public, no auth required
    if (req.method === 'POST' && pathname === '/api/auth/login') {
      await handleLogin(req as any, res as any, req.body);
      return;
    }

    // POST /api/auth/register — public, no auth required
    if (req.method === 'POST' && pathname === '/api/auth/register') {
      await handleRegister(req as any, res as any, req.body);
      return;
    }

    // GET /api/auth/me — requires auth (handleMe calls authenticateRequest internally)
    if (req.method === 'GET' && pathname === '/api/auth/me') {
      await handleMe(req as any, res as any);
      return;
    }

    // ------------------------------------------------------------------
    // Form Definitions Routes  (/api/form-definitions)
    // ------------------------------------------------------------------
    if (pathname.startsWith('/api/form-definitions')) {
      // GET /api/form-definitions — List
      if (req.method === 'GET' && matchPath(pathname, '/api/form-definitions').matched) {
        if (!(await requireAuth(req, res))) return;
        await handleListFormDefinitions(req as any, res as any);
        return;
      }
      // POST /api/form-definitions — Create
      if (req.method === 'POST' && matchPath(pathname, '/api/form-definitions').matched) {
        if (!(await requireAuth(req, res))) return;
        await handleCreateFormDefinition(req as any, res as any, req.body);
        return;
      }
      // GET /api/form-definitions/:id — Get by ID
      const getMatch = matchPath(pathname, '/api/form-definitions/:id');
      if (req.method === 'GET' && getMatch.matched) {
        if (!(await requireAuth(req, res))) return;
        await handleGetFormDefinition(req as any, res as any, undefined, getMatch.id);
        return;
      }
      // PUT /api/form-definitions/:id — Update
      const putMatch = matchPath(pathname, '/api/form-definitions/:id');
      if (req.method === 'PUT' && putMatch.matched) {
        if (!(await requireAuth(req, res))) return;
        await handleUpdateFormDefinition(req as any, res as any, req.body, putMatch.id);
        return;
      }
      // DELETE /api/form-definitions/:id — Delete
      const delMatch = matchPath(pathname, '/api/form-definitions/:id');
      if (req.method === 'DELETE' && delMatch.matched) {
        if (!(await requireAuth(req, res))) return;
        await handleDeleteFormDefinition(req as any, res as any, undefined, delMatch.id);
        return;
      }
    }

    // ------------------------------------------------------------------
    // Workflow Definitions Routes  (/api/workflow-definitions)
    // ------------------------------------------------------------------
    if (pathname.startsWith('/api/workflow-definitions')) {
      // GET /api/workflow-definitions — List
      if (req.method === 'GET' && matchPath(pathname, '/api/workflow-definitions').matched) {
        if (!(await requireAuth(req, res))) return;
        await handleListWorkflowDefinitions(req as any, res as any);
        return;
      }
      // POST /api/workflow-definitions — Create
      if (req.method === 'POST' && matchPath(pathname, '/api/workflow-definitions').matched) {
        if (!(await requireAuth(req, res))) return;
        await handleCreateWorkflowDefinition(req as any, res as any, req.body);
        return;
      }
      // GET /api/workflow-definitions/:id — Get by ID
      const getMatch = matchPath(pathname, '/api/workflow-definitions/:id');
      if (req.method === 'GET' && getMatch.matched) {
        if (!(await requireAuth(req, res))) return;
        await handleGetWorkflowDefinition(req as any, res as any, undefined, getMatch.id);
        return;
      }
      // PUT /api/workflow-definitions/:id — Update
      const putMatch = matchPath(pathname, '/api/workflow-definitions/:id');
      if (req.method === 'PUT' && putMatch.matched) {
        if (!(await requireAuth(req, res))) return;
        await handleUpdateWorkflowDefinition(req as any, res as any, req.body, putMatch.id);
        return;
      }
      // DELETE /api/workflow-definitions/:id — Delete
      const delMatch = matchPath(pathname, '/api/workflow-definitions/:id');
      if (req.method === 'DELETE' && delMatch.matched) {
        if (!(await requireAuth(req, res))) return;
        await handleDeleteWorkflowDefinition(req as any, res as any, undefined, delMatch.id);
        return;
      }
    }

    // ------------------------------------------------------------------
    // Form Submissions Routes  (/api/form-submissions)
    // ------------------------------------------------------------------
    if (pathname.startsWith('/api/form-submissions')) {
      // GET /api/form-submissions — List
      if (req.method === 'GET' && matchPath(pathname, '/api/form-submissions').matched) {
        if (!(await requireAuth(req, res))) return;
        await handleListFormSubmissions(req as any, res as any);
        return;
      }
      // POST /api/form-submissions — Create
      if (req.method === 'POST' && matchPath(pathname, '/api/form-submissions').matched) {
        if (!(await requireAuth(req, res))) return;
        await handleCreateFormSubmission(req as any, res as any, req.body);
        return;
      }
      // GET /api/form-submissions/:id — Get by ID
      const getMatch = matchPath(pathname, '/api/form-submissions/:id');
      if (req.method === 'GET' && getMatch.matched) {
        if (!(await requireAuth(req, res))) return;
        await handleGetFormSubmission(req as any, res as any, undefined, getMatch.id);
        return;
      }
      // PUT /api/form-submissions/:id — Update
      const putMatch = matchPath(pathname, '/api/form-submissions/:id');
      if (req.method === 'PUT' && putMatch.matched) {
        if (!(await requireAuth(req, res))) return;
        await handleUpdateFormSubmission(req as any, res as any, req.body, putMatch.id);
        return;
      }
      // DELETE /api/form-submissions/:id — Delete
      const delMatch = matchPath(pathname, '/api/form-submissions/:id');
      if (req.method === 'DELETE' && delMatch.matched) {
        if (!(await requireAuth(req, res))) return;
        await handleDeleteFormSubmission(req as any, res as any, undefined, delMatch.id);
        return;
      }
    }

    // ------------------------------------------------------------------
    // Approvals Routes  (/api/approvals)
    // ------------------------------------------------------------------
    if (pathname.startsWith('/api/approvals')) {
      // GET /api/approvals — List
      if (req.method === 'GET' && matchPath(pathname, '/api/approvals').matched) {
        if (!(await requireAuth(req, res))) return;
        await handleListApprovals(req as any, res as any);
        return;
      }
      // POST /api/approvals — Create
      if (req.method === 'POST' && matchPath(pathname, '/api/approvals').matched) {
        if (!(await requireAuth(req, res))) return;
        await handleCreateApproval(req as any, res as any, req.body);
        return;
      }
    }

    // ------------------------------------------------------------------
    // Equipment Routes  (/api/equipment)
    // ------------------------------------------------------------------
    if (pathname.startsWith('/api/equipment')) {
      // GET /api/equipment — List
      if (req.method === 'GET' && matchPath(pathname, '/api/equipment').matched) {
        if (!(await requireAuth(req, res))) return;
        await handleListEquipment(req as any, res as any);
        return;
      }
      // POST /api/equipment — Create
      if (req.method === 'POST' && matchPath(pathname, '/api/equipment').matched) {
        if (!(await requireAuth(req, res))) return;
        await handleCreateEquipment(req as any, res as any, req.body);
        return;
      }
      // GET /api/equipment/:id — Get by ID
      const getMatch = matchPath(pathname, '/api/equipment/:id');
      if (req.method === 'GET' && getMatch.matched) {
        if (!(await requireAuth(req, res))) return;
        await handleGetEquipment(req as any, res as any, undefined, getMatch.id);
        return;
      }
      // PUT /api/equipment/:id — Update
      const putMatch = matchPath(pathname, '/api/equipment/:id');
      if (req.method === 'PUT' && putMatch.matched) {
        if (!(await requireAuth(req, res))) return;
        await handleUpdateEquipment(req as any, res as any, req.body, putMatch.id);
        return;
      }
      // DELETE /api/equipment/:id — Delete
      const delMatch = matchPath(pathname, '/api/equipment/:id');
      if (req.method === 'DELETE' && delMatch.matched) {
        if (!(await requireAuth(req, res))) return;
        await handleDeleteEquipment(req as any, res as any, undefined, delMatch.id);
        return;
      }
    }

    // ------------------------------------------------------------------
    // Reports Routes  (/api/reports)
    // ------------------------------------------------------------------
    if (pathname.startsWith('/api/reports')) {
      // GET /api/reports/summary — Summary report
      if (req.method === 'GET' && matchPath(pathname, '/api/reports/summary').matched) {
        if (!(await requireAuth(req, res))) return;
        await handleSummaryReport(req as any, res as any);
        return;
      }
      // GET /api/reports/by-form — Per-form report
      if (req.method === 'GET' && matchPath(pathname, '/api/reports/by-form').matched) {
        if (!(await requireAuth(req, res))) return;
        await handleByFormReport(req as any, res as any);
        return;
      }
    }

    // ------------------------------------------------------------------
    // 404 - Route not found
    // ------------------------------------------------------------------
    sendJson(res, 404, {
      error: 'Not Found',
      message: `Route ${req.method} ${pathname} not found`,
    });
  } catch (err: any) {
    console.error('[Vercel Handler] Error handling request:', err);
    sendJson(res, 500, {
      error: 'Internal Server Error',
      message: err.message,
    });
  }
}
