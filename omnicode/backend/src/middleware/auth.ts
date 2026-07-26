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
  const [header, body, sig] = token.split('.');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const valid = await crypto.subtle.verify('HMAC', key,
    Uint8Array.from(atob(sig), c => c.charCodeAt(0)),
    new TextEncoder().encode(`${header}.${body}`));
  if (!valid) throw new Error('Invalid signature');
  const payload = JSON.parse(atob(body));
  if (payload.exp < Date.now()) throw new Error('Expired');
  return payload;
}
