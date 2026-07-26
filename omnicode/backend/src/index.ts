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
  origin: ['https://omnicode.app', 'https://t.me'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Telegram-Init-Data'],
}));

// ── Health ─────────────────────────────────────────────────────
app.get('/health', (c) => c.json({
  status: 'ok',
  version: '1.0.0',
  timestamp: new Date().toISOString(),
}));

// ── Public routes ──────────────────────────────────────────────
app.post('/auth/telegram', async (c) => {
  const { initData } = await c.req.json();
  // Validate Telegram WebApp initData
  // In production: verify HMAC signature
  const user = JSON.parse(decodeURIComponent(initData).split('user=')[1]?.split('&')[0] || '{}');
  if (!user.id) return c.json({ error: 'Invalid' }, 401);

  const token = await generateJWT({ userId: user.id, username: user.username }, c.env.JWT_SECRET);
  return c.json({ token, user });
});

// ── Protected routes ───────────────────────────────────────────
app.use('/api/*', authMiddleware);
app.route('/api/ai', aiRouter);
app.route('/api/projects', projectsRouter);
app.route('/api/github', githubRouter);
app.route('/api/deploy', deployRouter);

// ── 404 ────────────────────────────────────────────────────────
app.notFound((c) => c.json({ error: 'Not found' }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: err.message }, 500);
});

async function generateJWT(payload: object, secret: string): Promise<string> {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify({ ...payload, iat: Date.now(), exp: Date.now() + 86400000 * 7 }));
  const sig = await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw',
    new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
    new TextEncoder().encode(`${header}.${body}`));
  return `${header}.${body}.${btoa(String.fromCharCode(...new Uint8Array(sig)))}`;
}

export default app;
