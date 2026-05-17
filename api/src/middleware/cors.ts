/**
 * CORS (Cross-Origin Resource Sharing) middleware for the safety management API.
 *
 * Provides both a handler function and a convenient middleware-like interface
 * that can be used in the dev server or wiring layer.
 */

import type { ServerResponse } from 'http';

/** Default allowed origins — open in development, tighten for production. */
const ALLOWED_ORIGIN = '*';

/** Allowed HTTP methods. */
const ALLOWED_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';

/** Allowed request headers. */
const ALLOWED_HEADERS = 'Content-Type, Authorization, X-Requested-With';

/** How long (in seconds) the browser may cache the preflight response. */
const MAX_AGE = '86400';

/**
 * Apply CORS headers to an outgoing server response.
 *
 * Call this at the beginning of every request handler.
 *
 * @param res - The ServerResponse object to attach headers to.
 */
export function setCorsHeaders(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS);
  res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS);
  res.setHeader('Access-Control-Max-Age', MAX_AGE);
}

/**
 * Handle a CORS preflight (OPTIONS) request.
 *
 * Returns true if the request was a preflight and has been handled,
 * allowing the caller to short-circuit further processing.
 *
 * @param req - Incoming HTTP request
 * @param res - ServerResponse to write the preflight response to
 * @returns `true` if preflight was handled, `false` otherwise
 */
export function handlePreflight(
  req: { method?: string },
  res: ServerResponse,
): boolean {
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res);
    res.writeHead(204);
    res.end();
    return true;
  }
  return false;
}
