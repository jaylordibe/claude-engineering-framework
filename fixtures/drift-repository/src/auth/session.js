import { createHmac, timingSafeEqual } from 'node:crypto';

// Session cookies signed with a shared secret. There is no CASL, no ability
// rule set, and no `ability.ts` — authorization is whatever each handler does
// for itself, which is currently nothing beyond requiring a session.
export async function requireSession(request) {
  const cookie = request.headers.cookie ?? '';
  const [value, signature] = cookie.split('.');
  if (!value || !signature) return null;

  const expected = createHmac('sha256', process.env.SESSION_SECRET).update(value).digest('hex');
  const provided = Buffer.from(signature, 'hex');
  const computed = Buffer.from(expected, 'hex');
  if (provided.length !== computed.length || !timingSafeEqual(provided, computed)) return null;

  return JSON.parse(Buffer.from(value, 'base64').toString());
}
