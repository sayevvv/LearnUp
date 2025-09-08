// lib/security.ts
// Small, dependency-free helpers for input hygiene and basic checks.

export function sanitizeString(input: string, opts?: { maxLen?: number }) {
  const maxLen = opts?.maxLen ?? 512;
  let s = String(input);
  // Trim and cap length
  s = s.trim().slice(0, maxLen);
  // Remove control chars
  s = s.replace(/[\u0000-\u001F\u007F]/g, "");
  // Drop angle brackets to avoid accidental HTML injection if rendered
  s = s.replace(/[<>]/g, "");
  // Collapse whitespace
  s = s.replace(/\s+/g, " ");
  return s;
}

export function getClientIp(req: Request): string {
  // Works for Node/Edge; accepts common proxy headers
  const xff = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  const xrip = req.headers.get("x-real-ip") || "";
  return xff || xrip || "unknown";
}

export function isSameOrigin(req: Request, allowedOrigins: string[] = []): boolean {
  const origin = req.headers.get("origin") || "";
  if (!origin) return true; // likely same-origin or non-browser client
  if (allowedOrigins.length === 0) return true;
  return allowedOrigins.some((o) => origin.toLowerCase().startsWith(o.toLowerCase()));
}

// Build a simple allowlist based on env and request host; supports dev and prod
export function getAllowedOrigins(req: Request): string[] {
  const url = new URL(req.url);
  const hostHeader = req.headers.get('x-forwarded-host') || req.headers.get('host') || url.host;
  const proto = (req.headers.get('x-forwarded-proto') || url.protocol.replace(':','')) as 'http' | 'https';
  const hostOrigin = `${proto}://${hostHeader}`.toLowerCase();
  const list = new Set<string>([
    hostOrigin,
    'http://localhost:3000',
    'https://localhost:3000',
  ]);
  const appHost = process.env.APP_HOSTNAME; // e.g., myapp.com or myapp.vercel.app
  if (appHost) {
    list.add(`https://${appHost.toLowerCase()}`);
    list.add(`http://${appHost.toLowerCase()}`);
  }
  return Array.from(list);
}

export function assertSameOrigin(req: Request, extraAllowed: string[] = []) {
  const allowed = [...getAllowedOrigins(req), ...extraAllowed];
  if (!isSameOrigin(req, allowed)) {
    const err = new Error('Invalid origin');
    (err as any).status = 403;
    throw err;
  }
}

// Very simple in-memory rate limiter (best-effort, per instance)
type BucketKey = string;
const rateBuckets = new Map<BucketKey, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit = 10, windowMs = 60_000) {
  const now = Date.now();
  const b = rateBuckets.get(key);
  if (!b || b.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }
  if (b.count < limit) {
    b.count += 1;
    return { allowed: true, remaining: limit - b.count, resetAt: b.resetAt };
  }
  return { allowed: false, remaining: 0, resetAt: b.resetAt };
}
