#!/usr/bin/env node
import http from 'http';
import https from 'https';
import { readFileSync, existsSync } from 'fs';

// .env o'qish
if (existsSync('.env')) {
  readFileSync('.env', 'utf8').split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && v.length && !k.startsWith('#')) process.env[k.trim()] = v.join('=').trim();
  });
}

const PORT = process.env.PORT || 3000;

// OpenRouter keylarini yig'ish
const orKeys = [
  process.env.OPENROUTER_KEY_1,
  process.env.OPENROUTER_KEY_2,
  process.env.OPENROUTER_KEY_3,
  process.env.OPENROUTER_KEY_4,
].filter(k => k && k.length > 10);

let orKeyIndex = 0;
function nextORKey() {
  const key = orKeys[orKeyIndex % orKeys.length];
  orKeyIndex++;
  return key;
}

// Provayderlar tartibi
function buildProviders() {
  const list = [];

  // 1. OpenRouter (4 key, rotatsiya)
  if (orKeys.length > 0) {
    for (let i = 0; i < orKeys.length; i++) {
      list.push({
        name: `OpenRouter-${i + 1}`,
        host: 'openrouter.ai',
        path: '/api/v1/chat/completions',
        key: orKeys[i],
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        headers: {
          'HTTP-Referer': 'https://omniroute.local',
          'X-Title': 'OmniRoute',
        },
      });
    }
  }

  // 2. Groq
  if (process.env.GROQ_API_KEY) {
    list.push({
      name: 'Groq',
      host: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      key: process.env.GROQ_API_KEY,
      model: 'llama-3.3-70b-versatile',
    });
  }

  // 3. Pollinations (har doim, key yo'q)
  list.push({
    name: 'Pollinations',
    host: 'text.pollinations.ai',
    path: '/openai/v1/chat/completions',
    key: 'dummy',
    model: 'openai',
  });

  return list;
}

function httpsRequest(provider, body) {
  return new Promise((resolve, reject) => {
    const reqBody = {
      ...body,
      model: (!body.model || body.model === 'auto' ||
        body.model.startsWith('claude') || body.model.startsWith('gpt'))
        ? provider.model : body.model,
    };

    const data = JSON.stringify(reqBody);
    const options = {
      hostname: provider.host,
      path: provider.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'Authorization': `Bearer ${provider.key}`,
        'User-Agent': 'omniroute/1.0',
        ...(provider.headers || {}),
      },
      timeout: 30000,
    };

    const req = https.request(options, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        if (res.statusCode === 429 || res.statusCode === 503) {
          return reject(new Error(`${provider.name}: limit (${res.statusCode})`));
        }
        if (res.statusCode >= 400) {
          return reject(new Error(`${provider.name}: HTTP ${res.statusCode}`));
        }
        try {
          const r = JSON.parse(raw);
          r._provider = provider.name;
          resolve(r);
        } catch {
          reject(new Error(`${provider.name}: JSON xatolik`));
        }
      });
    });

    req.on('error', e => reject(new Error(`${provider.name}: ${e.message}`)));
    req.on('timeout', () => { req.destroy(); reject(new Error(`${provider.name}: timeout`)); });
    req.write(data);
    req.end();
  });
}

async function routeRequest(body) {
  const providers = buildProviders();
  const errors = [];
  for (const p of providers) {
    try {
      log(`→ ${p.name}`);
      const r = await httpsRequest(p, body);
      log(`✓ ${p.name}`);
      return r;
    } catch (e) {
      log(`✗ ${e.message}`);
      errors.push(e.message);
    }
  }
  throw new Error('Barcha provayderlar ishlamadi:\n' + errors.join('\n'));
}

function log(msg) {
  process.stdout.write(`[${new Date().toISOString().slice(11,19)}] ${msg}\n`);
}

function json(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data, null, 2));
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = req.url.split('?')[0];

  if (url === '/' || url === '/health') {
    return json(res, 200, {
      status: 'ok',
      providers: buildProviders().map(p => p.name),
      openrouter_keys: orKeys.length,
      groq: !!process.env.GROQ_API_KEY,
    });
  }

  if (url === '/v1/models') {
    return json(res, 200, {
      object: 'list',
      data: buildProviders().map(p => ({ id: p.model, provider: p.name })),
    });
  }

  if (url === '/v1/chat/completions' && req.method === 'POST') {
    let raw = '';
    req.on('data', c => raw += c);
    req.on('end', async () => {
      try {
        const r = await routeRequest(JSON.parse(raw));
        json(res, 200, r);
      } catch (e) {
        log('ERROR: ' + e.message);
        json(res, 500, { error: { message: e.message } });
      }
    });
    return;
  }

  res.writeHead(404); res.end('Not found\n');
});

server.listen(PORT, () => {
  const providers = buildProviders();
  console.log(`
╔═══════════════════════════════════════╗
║  ⚡ OmniRoute — ishga tushdi!        ║
╚═══════════════════════════════════════╝

📡 Faol provayderlar (${providers.length} ta):
${providers.map((p,i) => `   ${i+1}. ${p.name}`).join('\n')}

🔗 Claude Code ulash:
   claude config set apiBaseUrl http://localhost:${PORT}/v1
   claude config set apiKey omniroute
`);
});

process.on('SIGINT', () => { console.log('\n👋 To\'xtatildi'); process.exit(0); });
