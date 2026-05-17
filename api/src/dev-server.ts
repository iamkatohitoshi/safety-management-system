/**
 * Local development server for the Safety Management System API.
 *
 * Provides:
 *   - GET  /health  - Health check (status + DB connectivity)
 *   - ALL  *        - 404 for unmatched routes
 *
 * Runs migrations on startup.
 * Includes CORS headers for local dev.
 *
 * Usage:
 *   PORT=3001 tsx src/dev-server.ts
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { query, healthCheck, closePool } from './db/connection';
import { runMigrations } from './db/migrate';
import { handleLogin, handleRegister, handleMe } from './routes/auth';
import { setCorsHeaders, handlePreflight } from './middleware/cors';
import { handleListFormDefinitions, handleCreateFormDefinition, handleGetFormDefinition, handleUpdateFormDefinition, handleDeleteFormDefinition } from './routes/form-definitions';
import { handleListWorkflowDefinitions, handleCreateWorkflowDefinition, handleGetWorkflowDefinition, handleUpdateWorkflowDefinition, handleDeleteWorkflowDefinition } from './routes/workflow-definitions';
import { handleListFormSubmissions, handleCreateFormSubmission, handleGetFormSubmission, handleUpdateFormSubmission, handleDeleteFormSubmission } from './routes/form-submissions';
import { handleListApprovals, handleCreateApproval } from './routes/approvals';
import { handleListEquipment, handleCreateEquipment, handleGetEquipment, handleUpdateEquipment, handleDeleteEquipment } from './routes/equipment';
import { handleSummaryReport, handleByFormReport } from './routes/reports';
import { authenticateRequest } from './middleware/auth';

// Re-export for convenience — not used here but available to consumers
export { query, healthCheck, closePool };

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

/**
 * Parse the JSON body from an incoming HTTP request.
 */
function parseBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf-8');
      if (!raw) {
        resolve(undefined);
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Send a JSON response.
 */
function sendJson(res: ServerResponse, statusCode: number, data: unknown): void {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

/**
 * Match a URL pathname against a pattern with optional :id parameter.
 * Returns { matched: true, id?: string } on success, { matched: false } otherwise.
 *
 * Examples:
 *   matchPath('/api/form-definitions', '/api/form-definitions')        -> { matched: true }
 *   matchPath('/api/form-definitions/abc-123', '/api/form-definitions/:id') -> { matched: true, id: 'abc-123' }
 */
function matchPath(pathname: string, pattern: string): { matched: boolean; id?: string } {
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
 * On success, populates (req as any).auth with the decoded user info.
 */
async function requireAuth(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const ok = await authenticateRequest(req as any, res);
  if (!ok) {
    return false;
  }
  // Route handlers expect auth info on (req as any).auth
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

/**
 * Handle an incoming HTTP request.
 */
async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  setCorsHeaders(res);

  // Handle CORS preflight
  if (handlePreflight(req, res)) {
    return;
  }

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  try {
    // GET /health
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

    // POST /api/auth/login
    if (req.method === 'POST' && pathname === '/api/auth/login') {
      const body = await parseBody(req);
      await handleLogin(req, res, body);
      return;
    }

    // POST /api/auth/register
    if (req.method === 'POST' && pathname === '/api/auth/register') {
      const body = await parseBody(req);
      await handleRegister(req, res, body);
      return;
    }

    // GET /api/auth/me
    if (req.method === 'GET' && pathname === '/api/auth/me') {
      await handleMe(req, res);
      return;
    }

    // ------------------------------------------------------------------
    // Form Definitions Routes  (/api/form-definitions)
    // ------------------------------------------------------------------

    if (pathname.startsWith('/api/form-definitions')) {
      // GET /api/form-definitions — List
      if (req.method === 'GET' && matchPath(pathname, '/api/form-definitions').matched) {
        if (!(await requireAuth(req, res))) return;
        await handleListFormDefinitions(req as any, res);
        return;
      }
      // POST /api/form-definitions — Create
      if (req.method === 'POST' && matchPath(pathname, '/api/form-definitions').matched) {
        if (!(await requireAuth(req, res))) return;
        const body = await parseBody(req);
        await handleCreateFormDefinition(req as any, res, body);
        return;
      }
      // GET /api/form-definitions/:id — Get by ID
      const getMatch = matchPath(pathname, '/api/form-definitions/:id');
      if (req.method === 'GET' && getMatch.matched) {
        if (!(await requireAuth(req, res))) return;
        await handleGetFormDefinition(req as any, res, undefined, getMatch.id);
        return;
      }
      // PUT /api/form-definitions/:id — Update
      const putMatch = matchPath(pathname, '/api/form-definitions/:id');
      if (req.method === 'PUT' && putMatch.matched) {
        if (!(await requireAuth(req, res))) return;
        const body = await parseBody(req);
        await handleUpdateFormDefinition(req as any, res, body, putMatch.id);
        return;
      }
      // DELETE /api/form-definitions/:id — Delete
      const delMatch = matchPath(pathname, '/api/form-definitions/:id');
      if (req.method === 'DELETE' && delMatch.matched) {
        if (!(await requireAuth(req, res))) return;
        await handleDeleteFormDefinition(req as any, res, undefined, delMatch.id);
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
        await handleListWorkflowDefinitions(req as any, res);
        return;
      }
      // POST /api/workflow-definitions — Create
      if (req.method === 'POST' && matchPath(pathname, '/api/workflow-definitions').matched) {
        if (!(await requireAuth(req, res))) return;
        const body = await parseBody(req);
        await handleCreateWorkflowDefinition(req as any, res, body);
        return;
      }
      // GET /api/workflow-definitions/:id — Get by ID
      const getMatch = matchPath(pathname, '/api/workflow-definitions/:id');
      if (req.method === 'GET' && getMatch.matched) {
        if (!(await requireAuth(req, res))) return;
        await handleGetWorkflowDefinition(req as any, res, undefined, getMatch.id);
        return;
      }
      // PUT /api/workflow-definitions/:id — Update
      const putMatch = matchPath(pathname, '/api/workflow-definitions/:id');
      if (req.method === 'PUT' && putMatch.matched) {
        if (!(await requireAuth(req, res))) return;
        const body = await parseBody(req);
        await handleUpdateWorkflowDefinition(req as any, res, body, putMatch.id);
        return;
      }
      // DELETE /api/workflow-definitions/:id — Delete
      const delMatch = matchPath(pathname, '/api/workflow-definitions/:id');
      if (req.method === 'DELETE' && delMatch.matched) {
        if (!(await requireAuth(req, res))) return;
        await handleDeleteWorkflowDefinition(req as any, res, undefined, delMatch.id);
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
        await handleListFormSubmissions(req as any, res);
        return;
      }
      // POST /api/form-submissions — Create
      if (req.method === 'POST' && matchPath(pathname, '/api/form-submissions').matched) {
        if (!(await requireAuth(req, res))) return;
        const body = await parseBody(req);
        await handleCreateFormSubmission(req as any, res, body);
        return;
      }
      // GET /api/form-submissions/:id — Get by ID
      const getMatch = matchPath(pathname, '/api/form-submissions/:id');
      if (req.method === 'GET' && getMatch.matched) {
        if (!(await requireAuth(req, res))) return;
        await handleGetFormSubmission(req as any, res, undefined, getMatch.id);
        return;
      }
      // PUT /api/form-submissions/:id — Update
      const putMatch = matchPath(pathname, '/api/form-submissions/:id');
      if (req.method === 'PUT' && putMatch.matched) {
        if (!(await requireAuth(req, res))) return;
        const body = await parseBody(req);
        await handleUpdateFormSubmission(req as any, res, body, putMatch.id);
        return;
      }
      // DELETE /api/form-submissions/:id — Delete
      const delMatch = matchPath(pathname, '/api/form-submissions/:id');
      if (req.method === 'DELETE' && delMatch.matched) {
        if (!(await requireAuth(req, res))) return;
        await handleDeleteFormSubmission(req as any, res, undefined, delMatch.id);
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
        await handleListApprovals(req as any, res);
        return;
      }
      // POST /api/approvals — Create
      if (req.method === 'POST' && matchPath(pathname, '/api/approvals').matched) {
        if (!(await requireAuth(req, res))) return;
        const body = await parseBody(req);
        await handleCreateApproval(req as any, res, body);
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
        await handleListEquipment(req as any, res);
        return;
      }
      // POST /api/equipment — Create
      if (req.method === 'POST' && matchPath(pathname, '/api/equipment').matched) {
        if (!(await requireAuth(req, res))) return;
        const body = await parseBody(req);
        await handleCreateEquipment(req as any, res, body);
        return;
      }
      // GET /api/equipment/:id — Get by ID
      const getMatch = matchPath(pathname, '/api/equipment/:id');
      if (req.method === 'GET' && getMatch.matched) {
        if (!(await requireAuth(req, res))) return;
        await handleGetEquipment(req as any, res, undefined, getMatch.id);
        return;
      }
      // PUT /api/equipment/:id — Update
      const putMatch = matchPath(pathname, '/api/equipment/:id');
      if (req.method === 'PUT' && putMatch.matched) {
        if (!(await requireAuth(req, res))) return;
        const body = await parseBody(req);
        await handleUpdateEquipment(req as any, res, body, putMatch.id);
        return;
      }
      // DELETE /api/equipment/:id — Delete
      const delMatch = matchPath(pathname, '/api/equipment/:id');
      if (req.method === 'DELETE' && delMatch.matched) {
        if (!(await requireAuth(req, res))) return;
        await handleDeleteEquipment(req as any, res, undefined, delMatch.id);
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
        await handleSummaryReport(req as any, res);
        return;
      }
      // GET /api/reports/by-form — Per-form report
      if (req.method === 'GET' && matchPath(pathname, '/api/reports/by-form').matched) {
        if (!(await requireAuth(req, res))) return;
        await handleByFormReport(req as any, res);
        return;
      }
    }

    // 404 - Not found
    sendJson(res, 404, {
      error: 'Not Found',
      message: `Route ${req.method} ${pathname} not found`,
    });
  } catch (err: any) {
    console.error('[Server] Error handling request:', err);
    sendJson(res, 500, {
      error: 'Internal Server Error',
      message: err.message,
    });
  }
}

/**
 * Start the dev server after running migrations.
 */
async function start(): Promise<void> {
  try {
    console.log('========================================');
    console.log('  Safety Management System - Dev Server');
    console.log('========================================');

    // Run migrations on startup
    console.log('\n[Startup] Running database migrations...');
    await runMigrations(false); // false = don't exit process
    console.log('[Startup] Migrations complete.');

    // Start HTTP server
    const server = createServer(handleRequest);

    server.listen(PORT, HOST, () => {
      console.log(`\n[Server] Listening on http://${HOST}:${PORT}`);
      console.log('[Server] Health check: http://localhost:' + PORT + '/health');
      console.log('');
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await closePool();
        console.log('[Server] Connections closed. Goodbye.');
        process.exit(0);
      });
      // Force exit after 10 seconds
      setTimeout(() => {
        console.error('[Server] Forced shutdown after timeout.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err: any) {
    console.error('[Server] Failed to start:', err.message);
    process.exit(1);
  }
}

start();
