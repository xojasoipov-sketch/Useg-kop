import type { Context, Next } from 'hono';
import type { Env } from '../index';

export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const auth = c.req.header('Authorization');
  const tgData = c.req.header('X-Telegram-Init-Data');

  if (tgData) {
    try {
      const valid = await verifyTelegramData(tgData, c.env.BOT_TOKEN);
      if (valid) { c.set('userId', valid.userId); return next(); }
    } catch {}
  }

  if (auth?.startsWith('Bearer ')) {
    try {
      const payload = await verifyJWT(auth.slice(7), c.env.JWT_SECRET);
      c.set('userId', payload.userId);
      return next();
    } catch {}
  }

  return c.json({ error: 'Unauthorized' }, 401);
}

function b64urlDecode(str: string): string {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice(0, (4 - (str.length % 4)) % 4);
  return atob(padded);
}

function b64urlToBytes(str: string): Uint8Array {
  const binary = b64urlDecode(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function verifyTelegramData(initData: string, botToken: string) {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) throw new Error('No hash');

  params.delete('hash');
  const dataCheck = [...params.entries()].sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`).join('\n');

  const secretKey = await crypto.subtle.importKey('raw',
    new TextEncoder().encode('WebAppData'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const botKeyBytes = await crypto.subtle.sign('HMAC', secretKey, new TextEncoder().encode(botToken));

  const hmacKey = await crypto.subtle.importKey('raw', botKeyBytes,
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', hmacKey, new TextEncoder().encode(dataCheck));
  const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');

  if (computed !== hash) throw new Error('Invalid hash');

  const user = JSON.parse(params.get('user') || '{}');
  return { userId: String(user.id), username: user.username };
}

async function verifyJWT(token: string, secret: string) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token format');
  const [header, body, sig] = parts;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    b64urlToBytes(sig),
    new TextEncoder().encode(`${header}.${body}`)
  );
  if (!valid) throw new Error('Invalid signature');

  const payload = JSON.parse(b64urlDecode(body));
  // exp is in seconds (JWT standard)
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Expired');
  }
  return payload;
}
