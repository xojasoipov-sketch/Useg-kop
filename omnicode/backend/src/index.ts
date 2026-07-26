// ═══════════════════════════════════════════════════════════════
// OmniCode Backend — Cloudflare Workers
// Handles: AI routing, GitHub ops, project management, auth
// ═══════════════════════════════════════════════════════════════

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { aiRouter } from './routes/ai';
import { projectsRouter } from './routes/projects';
import { githubRouter } from './routes/github';
import { deployRouter } from './routes/deploy';
import { authMiddleware } from './middleware/auth';

export interface Env {
  OPENROUTER_KEY_1: string;
  OPENROUTER_KEY_2: string;
  OPENROUTER_KEY_3: string;
  OPENROUTER_KEY_4: string;
  GROQ_API_KEY: string;
  GITHUB_TOKEN: string;
  SUPABASE_URL: string;
  SUPABASE_KEY: string;
  BOT_TOKEN: string;
  JWT_SECRET: string;
  DB: D1Database;
  STORAGE: R2Bucket;
}

const app = new Hono<{ Bindings: Env }>();

// ── Middleware ─────────────────────────────────────────────────
app.use('*', logger());
app.use('*', cors({
  origin: ['https://omnicode.app', 'https://t.me', 'http://localhost:5173', 'http://localhost:3000'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Telegram-Init-Data'],
}));

// ── Health ───────────────────────────────────────────────────
app.get('/health', (c) => c.json({
  status: 'ok',
  version: '1.0.0',
  timestamp: new Date().toISOString(),
}));

// Base64URL helpers (JWT standard)
function b64url(data: string | ArrayBuffer): string {
  const bytes = typeof data === 'string'
    ? new TextEncoder().encode(data)
    : new Uint8Array(data);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ── Public routes ────────────────────────────────────────────
app.post('/auth/telegram', async (c) => {
  const { initData } = await c.req.json();
  if (!initData || typeof initData !== 'string') {
    return c.json({ error: 'initData required' }, 400);
  }

  // Parse Telegram WebApp initData safely via URLSearchParams
  const params = new URLSearchParams(initData);
  const userRaw = params.get('user');
  if (!userRaw) return c.json({ error: 'Invalid initData: no user' }, 401);

  let user: { id?: number; username?: string };
  try {
    user = JSON.parse(userRaw);
  } catch {
    return c.json({ error: 'Invalid user JSON' }, 401);
  }
  if (!user.id) return c.json({ error: 'Invalid user id' }, 401);

  // TODO: productionda HMAC signature tekshirish (auth middleware dagi verifyTelegramData)
  const token = await generateJWT(
    { userId: String(user.id), username: user.username || '' },
    c.env.JWT_SECRET
  );
  return c.json({ token, user });
});

// ── Protected routes ─────────────────────────────────────────
app.use('/api/*', authMiddleware);
app.route('/api/ai', aiRouter);
app.route('/api/projects', projectsRouter);
app.route('/api/github', githubRouter);
app.route('/api/deploy', deployRouter);

// ── 404 ────────────────────────────────────────────────────
app.notFound((c) => c.json({ error: 'Not found' }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: err.message }, 500);
});

async function generateJWT(payload: object, secret: string): Promise<string> {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify({
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400 * 7, // 7 days in seconds
  }));
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${header}.${body}`)
  );
  return `${header}.${body}.${b64url(sig)}`;
}

export default app;
