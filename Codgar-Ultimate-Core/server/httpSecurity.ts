/**
 * HTTP security layer (CORS + Origin/CSRF guard + dangerous-route gate).
 *
 * Design goals (keeps the existing architecture intact):
 *  - The local UI (same origin, either served by this server or proxied through a
 *    preview host) keeps working with zero configuration.
 *  - Any request coming from a *different* browser origin (CSRF) is rejected before
 *    it can reach a route that executes shell commands / writes files.
 *  - Requests that are not verified as same-origin must present `ADMIN_TOKEN`
 *    (env) to reach a "dangerous" route. This is what makes binding to 0.0.0.0 or
 *    exposing the port through a tunnel safe.
 *
 * Nothing here changes route semantics: it only decides whether a request is
 * allowed to continue.
 */
import type { Request, Response, NextFunction } from 'express';

/** Routes that can execute code / mutate the local machine. */
const DANGEROUS_ROUTES: RegExp[] = [
  /^\/api\/mcp\/(shell|action)$/,
  /^\/api\/terminal\/(exec|execute|cancel)$/,
  /^\/api\/sandbox\/(compile|execute)$/,
  /^\/api\/compiler\/(execute|install-tool|auto-install-config)$/,
  /^\/api\/local-bridge\/(execute|organize-desktop|connect)$/,
  /^\/api\/router\/install-package$/,
  /^\/api\/fs\/(write|delete|move)$/,
  /^\/api\/patch\/apply$/,
  /^\/api\/security\/scan$/,
  /^\/api\/files\/content$/,
  /^\/api\/git\/(commit|push|checkout)$/,
  /^\/api\/claude\/terminal$/,
  /^\/api\/projects\/create-test$/,
  /^\/api\/keys\/(add|generate|rotate)$/,
];

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function envList(name: string): string[] {
  return String(process.env[name] || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function getAdminToken(): string | null {
  const token = String(process.env.ADMIN_TOKEN || '').trim();
  // Never accept the placeholder that ships in .env.example
  if (!token || token === 'CHANGE_ME_long_random_token') return null;
  return token;
}

export function strictExecToken(): boolean {
  return process.env.CODGAR_STRICT_EXEC_TOKEN === '1';
}

export function isLoopbackRequest(req: Request): boolean {
  const raw = (req.socket?.remoteAddress || req.ip || '').toString();
  const addr = raw.replace(/^::ffff:/, '');
  return (
    addr === '127.0.0.1' ||
    addr === '::1' ||
    addr === 'localhost' ||
    addr.startsWith('127.')
  );
}

export function isLocalHostname(host: string): boolean {
  const h = host.split(':')[0].toLowerCase();
  return (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h === '::1' ||
    h === '0.0.0.0' ||
    h.endsWith('.local') ||
    h.endsWith('.e2b.app')
  );
}

export function allowedOrigins(): string[] {
  return envList('ALLOWED_ORIGINS');
}

/** True when the Origin header matches the Host this request was sent to. */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.origin;
  if (!origin) return false;
  let originHost: string;
  try {
    originHost = new URL(origin).host.toLowerCase();
  } catch {
    return false;
  }
  const host = String(req.headers.host || '').toLowerCase();
  if (host && originHost === host) return true;
  return false;
}

/** Origin is acceptable when absent, same-origin, local, or explicitly allow-listed. */
export function originAllowed(req: Request): boolean {
  const origin = req.headers.origin;
  if (!origin) return true; // native clients / curl / server-to-server
  if (allowedOrigins().includes(origin)) return true;
  if (isSameOrigin(req)) return true;
  try {
    return isLocalHostname(new URL(origin).host);
  } catch {
    return false;
  }
}

export function isDangerousRoute(pathname: string): boolean {
  return DANGEROUS_ROUTES.some((rx) => rx.test(pathname));
}

function tokenMatches(req: Request): boolean {
  const expected = getAdminToken();
  if (!expected) return false;
  const sent =
    String(req.headers['x-admin-token'] || '') ||
    String(req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
  return sent.length > 0 && sent === expected;
}

/**
 * CORS: replies to pre-flight requests and echoes only explicitly permitted
 * origins (same host, localhost, preview hosts, or ALLOWED_ORIGINS).
 */
export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers.origin;
  if (origin && (allowedOrigins().includes(origin) || isSameOrigin(req) || isLocalHostname(new URL(origin).host))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Admin-Token, X-Anthropic-Key, X-Requested-With'
    );
    res.setHeader('Access-Control-Max-Age', '600');
  } else if (origin) {
    res.setHeader('Vary', 'Origin');
  }

  if (req.method === 'OPTIONS') {
    res.status(origin && !originAllowed(req) ? 403 : 204).end();
    return;
  }
  next();
}

/**
 * CSRF guard: browsers always attach `Origin` to cross-site POST/PUT/DELETE
 * (including form posts and "simple" fetch requests). Rejecting foreign origins
 * closes the drive-by RCE/CSRF hole without breaking same-origin UI usage.
 */
export function originGuard(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) return next();
  const origin = req.headers.origin;
  if (origin && !originAllowed(req)) {
    const forwardedProto = String(req.headers['x-forwarded-proto'] || '');
    res.status(403).json({
      success: false,
      error: 'ORIGIN_NOT_ALLOWED',
      message: `درخواست از مبدأ غیرمجاز مسدود شد: ${origin}${forwardedProto ? '' : ''}. در صورت نیاز ALLOWED_ORIGINS را تنظیم کنید.`,
    });
    return;
  }
  if (req.headers['sec-fetch-site'] === 'cross-site' && !tokenMatches(req)) {
    res.status(403).json({
      success: false,
      error: 'CROSS_SITE_BLOCKED',
      message: 'درخواست بین‌سایتی (CSRF) مسدود شد.',
    });
    return;
  }
  next();
}

/**
 * Gate for code-execution / filesystem mutation routes.
 * Allowed when: same-origin browser request, loopback client, or a valid ADMIN_TOKEN.
 * `CODGAR_STRICT_EXEC_TOKEN=1` forces the token even for loopback clients.
 */
export function execRouteGuard(req: Request, res: Response, next: NextFunction): void {
  const pathname = String(req.path || req.url || '').split('?')[0];
  if (!isDangerousRoute(pathname)) return next();

  const tokenOk = tokenMatches(req);
  if (tokenOk) return next();

  if (strictExecToken()) {
    res.status(401).json({
      success: false,
      error: 'ADMIN_TOKEN_REQUIRED',
      message: 'برای اجرای این عملیات، هدر X-Admin-Token لازم است (CODGAR_STRICT_EXEC_TOKEN=1).',
    });
    return;
  }

  const trustedClient = isLoopbackRequest(req) || isSameOrigin(req);
  if (!trustedClient) {
    res.status(401).json({
      success: false,
      error: 'ADMIN_TOKEN_REQUIRED',
      message:
        'این اندپوینت فرمان اجرا می‌کند و فقط برای درخواست‌های هم‌مبدأ/لوکال یا همراه با هدر X-Admin-Token مجاز است.',
    });
    return;
  }
  next();
}

/** Blocks unsafe JSON bodies on non-JSON content types (avoids text/plain CSRF bodies). */
export function requireJsonBody(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) return next();
  const pathname = String(req.path || req.url || '').split('?')[0];
  if (!isDangerousRoute(pathname)) return next();
  const type = String(req.headers['content-type'] || '');
  if (type && !type.includes('application/json') && !type.startsWith('audio/') && !type.includes('multipart/form-data')) {
    res.status(415).json({
      success: false,
      error: 'UNSUPPORTED_MEDIA_TYPE',
      message: 'برای این اندپوینت بدنه با Content-Type: application/json ارسال کنید.',
    });
    return;
  }
  next();
}

/**
 * Crash guard: unhandled `error` events from child_process (e.g. spawn ENOENT)
 * and stray promise rejections must never take the whole server down.
 */
export function installProcessGuards(logger: Pick<Console, 'error' | 'warn'> = console): void {
  process.on('uncaughtException', (err: any) => {
    const code = err?.code ? ` [${err.code}]` : '';
    logger.error(`[fatal-guard] uncaughtException${code}:`, err?.message || err);
    if (err?.stack) logger.error(err.stack);
  });
  process.on('unhandledRejection', (reason: any) => {
    logger.error('[fatal-guard] unhandledRejection:', reason?.message || reason);
  });
}

export function securityMiddleware() {
  return [corsMiddleware, originGuard, requireJsonBody, execRouteGuard];
}
