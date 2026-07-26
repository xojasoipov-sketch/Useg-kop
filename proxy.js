#!/usr/bin/env node
// OmniRoute Proxy — bepul provayderlar orqali OpenAI-compatible endpoint
// Lokal mashinangizda ishga tushiring: node proxy.js
import http from 'http';
import https from 'https';
import { readFileSync, existsSync } from 'fs';
import { URL } from 'url';

// .env o'qish
if (existsSync('.env')) {
  readFileSync('.env', 'utf8').split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && v.length && !k.startsWith('#')) {
      process.env[k.trim()] = v.join('=').trim();
    }
  });
}

const PORT = process.env.PORT || 3000;

// ── PROVAYDERLAR ────────────────────────────────────────────────────
const PROVIDERS = [
  {
    name: 'Pollinations',
    host: 'text.pollinations.ai',
    path: '/openai/v1/chat/completions',
    key: 'dummy',
    model: 'openai',
    free: true,
    alwaysOn: true, // key shart emas
  },
  {
    name: 'Groq',
    host: 'api.groq.com',
    path: '/openai/v1/chat/completions',
    key: process.env.GROQ_API_KEY,
    model: 'llama-3.3-70b-versatile',
    free: true,
  },
  {
    name: 'Cerebras',
    host: 'api.cerebras.ai',
    path: '/v1/chat/completions',
    key: process.env.CEREBRAS_API_KEY,
    model: 'llama3.1-70b',
    free: true,
  },
  {
    name: 'Gemini',
    host: 'generativelanguage.googleapis.com',
    path: '/v1beta/openai/chat/completions',
    key: process.env.GEMINI_API_KEY,
    model: 'gemini-2.0-flash',
    free: true,
  },
  {
    name: 'DeepSeek',
    host: 'api.deepseek.com',
    path: '/chat/completions',
    key: process.env.DEEPSEEK_API_KEY,
    model: 'deepseek-chat',
    free: true,
  },
  {
    name: 'Mistral',
    host: 'api.mistral.ai',
    path: '/v1/chat/completions',
    key: process.env.MISTRAL_API_KEY,
    model: 'mistral-small-latest',
    free: true,
  },
  {
    name: 'Together',
    host: 'api.together.xyz',
    path: '/v1/chat/completions',
    key: process.env.TOGETHER_API_KEY,
    model: 'meta-llama/Llama-3-70b-chat-hf',
    free: true,
  },
  {
    name: 'HuggingFace',
    host: 'api-inference.huggingface.co',
    path: '/models/meta-llama/Llama-3.2-3B-Instruct/v1/chat/completions',
    key: process.env.HUGGINGFACE_API_KEY,
    model: 'meta-llama/Llama-3.2-3B-Instruct',
    free: true,
  },
  {
    name: 'NVIDIA',
    host: 'integrate.api.nvidia.com',
    path: '/v1/chat/completions',
    key: process.env.NVIDIA_API_KEY,
    model: 'meta/llama-3.1-70b-instruct',
    free: true,
  },
];

// Faol provayderlar
function activeProviders() {
  return PROVIDERS.filter(p => p.alwaysOn || (p.key && p.key !== 'undefined' && p.key.length > 5));
}

// HTTPS so'rov
function httpsRequest(provider, body) {
  return new Promise((resolve, reject) => {
    const reqBody = { ...body, model: body.model === 'auto' || !body.model ||
      body.model.startsWith('claude') || body.model.startsWith('gpt')
      ? provider.model : body.model };

    const data = JSON.stringify(reqBody);
    const options = {
      hostname: provider.host,
      path: provider.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'Authorization': `Bearer ${provider.key}`,
        'User-Agent': 'omniroute-proxy/1.0',
      },
      timeout: 30000,
    };

    const req = https.request(options, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        if (res.statusCode === 429 || res.statusCode === 503) {
          reject(new Error(`${provider.name}: limit (${res.statusCode})`));
        } else if (res.statusCode >= 400) {
          reject(new Error(`${provider.name}: HTTP ${res.statusCode}`));
        } else {
          try {
            const result = JSON.parse(raw);
            result._provider = provider.name;
            result._model_used = provider.model;
            resolve(result);
          } catch {
            reject(new Error(`${provider.name}: invalid JSON`));
          }
        }
      });
    });

    req.on('error', err => reject(new Error(`${provider.name}: ${err.message}`)));
    req.on('timeout', () => { req.destroy(); reject(new Error(`${provider.name}: timeout`)); });
    req.write(data);
    req.end();
  });
}

// Fallback routing
async function routeRequest(body) {
  const providers = activeProviders();
  const errors = [];

  for (const provider of providers) {
    try {
      log(`→ ${provider.name} (${provider.model})`);
      const result = await httpsRequest(provider, body);
      log(`✓ ${provider.name} — javob olindi`);
      return result;
    } catch (err) {
      log(`✗ ${err.message}`);
      errors.push(err.message);
    }
  }

  throw new Error(`Barcha provayderlar ishlamadi:\n${errors.join('\n')}`);
}

function log(msg) {
  process.stdout.write(`[${new Date().toISOString().slice(11,19)}] ${msg}\n`);
}

function sendJSON(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data, null, 2));
}

// ── HTTP SERVER ──────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = req.url.split('?')[0];

  // Health check
  if (url === '/' || url === '/health') {
    const active = activeProviders();
    return sendJSON(res, 200, {
      status: 'ok',
      port: PORT,
      providers: active.map(p => ({ name: p.name, model: p.model, free: p.free })),
      total: active.length,
      claude_code_setup: {
        apiBaseUrl: `http://localhost:${PORT}/v1`,
        apiKey: 'omniroute',
      },
    });
  }

  // Models ro'yxati
  if (url === '/v1/models') {
    return sendJSON(res, 200, {
      object: 'list',
      data: activeProviders().map(p => ({
        id: p.model,
        object: 'model',
        provider: p.name,
        free: p.free,
      })),
    });
  }

  // Chat completions
  if (url === '/v1/chat/completions' && req.method === 'POST') {
    let raw = '';
    req.on('data', c => raw += c);
    req.on('end', async () => {
      try {
        const body = JSON.parse(raw);
        const result = await routeRequest(body);
        sendJSON(res, 200, result);
      } catch (err) {
        log(`ERROR: ${err.message}`);
        sendJSON(res, 500, { error: { message: err.message, type: 'proxy_error' } });
      }
    });
    return;
  }

  res.writeHead(404); res.end('Not found\n');
});

server.listen(PORT, () => {
  const active = activeProviders();
  const lines = [
    '',
    '╔══════════════════════════════════════════╗',
    '║   ⚡ OmniRoute Proxy — ishga tushdi!    ║',
    `╚══════════════════════════════════════════╝`,
    '',
    `🌐 URL: http://localhost:${PORT}`,
    '',
    `📡 Faol provayderlar (${active.length} ta):`,
    ...active.map((p, i) => `   ${i+1}. ${p.name.padEnd(12)} ${p.model}`),
    '',
    '📋 Claude Code bilan ulash:',
    `   claude config set apiBaseUrl http://localhost:${PORT}/v1`,
    '   claude config set apiKey omniroute',
    '',
    "🔑 Ko'proq provider qo'shish: .env fayliga keylarni kiriting",
    '',
  ];
  console.log(lines.join('\n'));
});

process.on('SIGINT', () => { console.log('\n👋 OmniRoute to\'xtatildi'); process.exit(0); });
