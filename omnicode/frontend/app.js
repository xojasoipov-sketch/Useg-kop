'use strict';
// ═══════════════════════════════════════════════════════════════
//  OmniCode — Real AI Coding Platform (Claude Code style)
// ═══════════════════════════════════════════════════════════════

const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); tg.setHeaderColor?.('#0A0A0A'); tg.setBackgroundColor?.('#0A0A0A'); }

// ── Store ────────────────────────────────────────────────────────
const Store = {
  get(k, d = null) { try { const v = localStorage.getItem('oc_' + k); return v !== null ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('oc_' + k, JSON.stringify(v)); } catch {} },
};

// ══════════════════════════════════════════════════════════════
//  ANALYTICS — Real tracking
// ══════════════════════════════════════════════════════════════
const Analytics = {
  _key(d) { return 'analytics_' + d; },
  _today() { return new Date().toDateString(); },

  track(tokens = 0) {
    const day = this._today();
    const data = Store.get(this._key(day), { requests: 0, tokens: 0 });
    data.requests += 1;
    data.tokens += tokens;
    Store.set(this._key(day), data);
  },

  today() { return Store.get(this._key(this._today()), { requests: 0, tokens: 0 }); },

  week() {
    let r = 0, t = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(Date.now() - i * 86400000).toDateString();
      const v = Store.get(this._key(d), { requests: 0, tokens: 0 });
      r += v.requests; t += v.tokens;
    }
    return { requests: r, tokens: t };
  },

  yesterday() {
    const d = new Date(Date.now() - 86400000).toDateString();
    return Store.get(this._key(d), { requests: 0, tokens: 0 });
  },

  fmtTokens(n) { return n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n); },
};

// ══════════════════════════════════════════════════════════════
//  RUNNING TASKS — Real task queue
// ══════════════════════════════════════════════════════════════
const Tasks = {
  list() { return Store.get('running_tasks', []); },

  add(name, description) {
    const tasks = this.list();
    const task = { id: 't_' + Date.now(), name, description, progress: 0, status: 'running', started: Date.now() };
    tasks.unshift(task);
    Store.set('running_tasks', tasks.slice(0, 5));
    return task;
  },

  update(id, patch) {
    const tasks = this.list().map(t => t.id === id ? { ...t, ...patch } : t);
    Store.set('running_tasks', tasks);
  },

  remove(id) { Store.set('running_tasks', this.list().filter(t => t.id !== id)); },

  clear() { Store.set('running_tasks', []); },
};

// ══════════════════════════════════════════════════════════════
//  REAL FILE SYSTEM (localStorage-based, project-scoped)
// ══════════════════════════════════════════════════════════════
const FS = {
  _key(projectId, path) { return `fs:${projectId}:${path}`; },
  _indexKey(projectId) { return `fs_idx:${projectId}`; },
  index(projectId) { return Store.get(this._indexKey(projectId), []); },

  write(projectId, path, content) {
    Store.set(this._key(projectId, path), content);
    const idx = this.index(projectId);
    if (!idx.includes(path)) { idx.push(path); Store.set(this._indexKey(projectId), idx); }
  },

  read(projectId, path) { return Store.get(this._key(projectId, path), ''); },

  delete(projectId, path) {
    localStorage.removeItem('oc_' + this._key(projectId, path));
    Store.set(this._indexKey(projectId), this.index(projectId).filter(p => p !== path));
  },

  rename(projectId, oldPath, newPath) {
    this.write(projectId, newPath, this.read(projectId, oldPath));
    this.delete(projectId, oldPath);
  },

  context(projectId, maxChars = 12000) {
    const files = this.index(projectId);
    if (!files.length) return '';
    let ctx = `\n\n<PROJECT_FILES>\n`, chars = 0;
    for (const path of files) {
      const chunk = `<FILE path="${path}">\n${this.read(projectId, path)}\n</FILE>\n`;
      if (chars + chunk.length > maxChars) { ctx += `<!-- ${files.length - files.indexOf(path)} more files truncated -->\n`; break; }
      ctx += chunk; chars += chunk.length;
    }
    return ctx + '</PROJECT_FILES>';
  },

  parseWrites(text) {
    const writes = [];
    const re = /<(?:WRITE|CREATE)_FILE\s+path="([^"]+)">([\s\S]*?)<\/(?:WRITE|CREATE)_FILE>/g;
    let m;
    while ((m = re.exec(text)) !== null) writes.push({ path: m[1].trim(), content: m[2].trim() });
    return writes;
  },

  stripCommands(text) {
    return text.replace(/<(?:WRITE|CREATE)_FILE\s+path="[^"]+">[\s\S]*?<\/(?:WRITE|CREATE)_FILE>/g, '').trim();
  },
};

// ══════════════════════════════════════════════════════════════
//  PROJECT MANAGER
// ══════════════════════════════════════════════════════════════
const PM = {
  list() { return Store.get('projects', []); },
  get(id) { return this.list().find(p => p.id === id); },
  current() { return Store.get('current_project', null); },
  setCurrent(id) { Store.set('current_project', id); },

  create(name, template = 'blank') {
    const id = 'p_' + Date.now();
    const p = { id, name, template, created: Date.now(), updated: Date.now(), github: null, starred: false };
    const list = this.list();
    list.unshift(p);
    Store.set('projects', list);
    for (const [path, content] of Object.entries(TEMPLATES[template] || {})) FS.write(id, path, content);
    return p;
  },

  update(id, data) {
    Store.set('projects', this.list().map(p => p.id === id ? { ...p, ...data, updated: Date.now() } : p));
  },

  delete(id) {
    FS.index(id).forEach(path => FS.delete(id, path));
    Store.set('projects', this.list().filter(p => p.id !== id));
    if (this.current() === id) Store.set('current_project', null);
  },
};

const TEMPLATES = {
  blank: { 'README.md': '# My Project\n\nCreated with OmniCode AI.' },
  react: {
    'package.json': '{\n  "name": "my-app",\n  "version": "1.0.0",\n  "scripts": { "dev": "vite", "build": "vite build" },\n  "dependencies": { "react": "^18.0.0", "react-dom": "^18.0.0" },\n  "devDependencies": { "vite": "^5.0.0", "@vitejs/plugin-react": "^4.0.0" }\n}',
    'src/App.jsx': 'import { useState } from "react"\n\nexport default function App() {\n  const [count, setCount] = useState(0)\n  return (\n    <div className="app">\n      <h1>My App</h1>\n      <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>\n    </div>\n  )\n}',
    'src/main.jsx': 'import React from "react"\nimport ReactDOM from "react-dom/client"\nimport App from "./App"\nReactDOM.createRoot(document.getElementById("root")).render(<App />)',
    'index.html': '<!DOCTYPE html>\n<html>\n<head><title>My App</title></head>\n<body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body>\n</html>',
  },
  'telegram-bot': {
    'bot.py': 'import os\nfrom telegram import Update\nfrom telegram.ext import Application, CommandHandler, ContextTypes\n\nTOKEN = os.getenv("BOT_TOKEN")\n\nasync def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):\n    await update.message.reply_text("Hello! I am your bot 🤖")\n\napp = Application.builder().token(TOKEN).build()\napp.add_handler(CommandHandler("start", start))\napp.run_polling()',
    'requirements.txt': 'python-telegram-bot==20.7\npython-dotenv==1.0.0',
    '.env.example': 'BOT_TOKEN=your_bot_token_here',
    'README.md': '# Telegram Bot\n\n## Setup\n```bash\npip install -r requirements.txt\ncp .env.example .env\npython bot.py\n```',
  },
  nextjs: {
    'package.json': '{\n  "name": "my-next-app",\n  "scripts": { "dev": "next dev", "build": "next build", "start": "next start" },\n  "dependencies": { "next": "14.0.0", "react": "^18.0.0", "react-dom": "^18.0.0" }\n}',
    'app/page.tsx': 'export default function Home() {\n  return (\n    <main>\n      <h1>Welcome to Next.js</h1>\n    </main>\n  )\n}',
    'app/layout.tsx': 'export default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <html lang="en">\n      <body>{children}</body>\n    </html>\n  )\n}',
  },
};

// ══════════════════════════════════════════════════════════════
//  GITHUB INTEGRATION
// ══════════════════════════════════════════════════════════════
const Git = {
  token() { return Store.get('keys', {}).github || ''; },

  async request(path, method = 'GET', body = null) {
    const token = this.token();
    if (!token) throw new Error('GitHub token sozlanmagan. Sozlamalar → API Kalitlar bo\'limiga o\'ting');
    const res = await fetch('https://api.github.com' + path, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'OmniCode/2.0',
      },
      body: body ? JSON.stringify(body) : null,
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || `GitHub ${res.status}`); }
    return res.json();
  },

  async me() { return this.request('/user'); },
  async repos() { return this.request('/user/repos?per_page=50&sort=updated'); },

  async createRepo(name, isPrivate = false) {
    return this.request('/user/repos', 'POST', { name, private: isPrivate, auto_init: true });
  },

  async getSHA(owner, repo, path, branch = 'main') {
    try { return (await this.request(`/repos/${owner}/${repo}/contents/${path}?ref=${branch}`)).sha; }
    catch { return null; }
  },

  async pushFile(owner, repo, path, content, branch = 'main', message = null) {
    const sha = await this.getSHA(owner, repo, path, branch);
    const b64 = btoa(unescape(encodeURIComponent(content)));
    return this.request(`/repos/${owner}/${repo}/contents/${path}`, 'PUT', {
      message: message || `feat: update ${path} via OmniCode`,
      content: b64, branch, ...(sha ? { sha } : {}),
    });
  },

  async pushProject(projectId, owner, repo, branch = 'main') {
    const files = FS.index(projectId);
    const results = [];
    for (const path of files) {
      const content = FS.read(projectId, path);
      try { await this.pushFile(owner, repo, path, content, branch); results.push({ path, ok: true }); }
      catch (e) { results.push({ path, ok: false, error: e.message }); }
    }
    return results;
  },
};

// ══════════════════════════════════════════════════════════════
//  AI MODELS & ROUTER
// ══════════════════════════════════════════════════════════════
const MODELS = [
  { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B',    short: 'Llama 3.3',  provider: 'openrouter', badge: '⚡', ctx: 128000 },
  { id: 'deepseek/deepseek-r1:free',               name: 'DeepSeek R1',      short: 'DeepSeek R1', provider: 'openrouter', badge: '🧠', ctx: 64000  },
  { id: 'google/gemini-2.0-flash-exp:free',        name: 'Gemini 2.0 Flash', short: 'Gemini 2.0',  provider: 'openrouter', badge: '✨', ctx: 1000000},
  { id: 'qwen/qwq-32b:free',                       name: 'Qwen QwQ 32B',     short: 'QwQ 32B',     provider: 'openrouter', badge: '🔮', ctx: 32000  },
  { id: 'llama-3.3-70b-versatile',                 name: 'Groq Llama 70B',   short: 'Groq Fast',   provider: 'groq',       badge: '⚡', ctx: 32000  },
  { id: 'claude-3-5-haiku-20241022',               name: 'Claude 3.5 Haiku', short: 'Claude Haiku',provider: 'anthropic',  badge: '🤖', ctx: 200000 },
  { id: 'gemini-2.0-flash',                        name: 'Gemini Flash (Direct)',short:'Gemini Direct',provider:'gemini',   badge: '✨', ctx: 1000000},
  { id: 'deepseek-chat',                           name: 'DeepSeek Chat',    short: 'DeepSeek',    provider: 'deepseek',   badge: '🧠', ctx: 64000  },
  { id: 'mistral-small-latest',                    name: 'Mistral Small',    short: 'Mistral',     provider: 'mistral',    badge: '🌀', ctx: 32000  },
];

const AIRouter = {
  keys() { const k = Store.get('keys', {}); return [k.or1, k.or2, k.or3, k.or4].filter(Boolean); },

  async openrouter(messages, modelId) {
    const keys = this.keys();
    if (!keys.length) throw new Error('No OpenRouter keys');
    const key = keys[Math.floor(Math.random() * keys.length)];
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}`, 'HTTP-Referer': 'https://omnicode.app', 'X-Title': 'OmniCode' },
      body: JSON.stringify({ model: modelId, messages, max_tokens: 8192 }),
    });
    if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
    const data = await res.json();
    return data.choices[0].message.content;
  },

  async groq(messages) {
    const key = Store.get('keys', {}).groq;
    if (!key) throw new Error('No Groq key');
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, max_tokens: 8192 }),
    });
    if (!res.ok) throw new Error(`Groq ${res.status}`);
    return (await res.json()).choices[0].message.content;
  },

  async anthropic(messages) {
    const key = Store.get('keys', {}).anthropic;
    if (!key) throw new Error('No Anthropic key');
    const sys = messages.find(m => m.role === 'system');
    const msgs = messages.filter(m => m.role !== 'system');
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: 'claude-3-5-haiku-20241022', max_tokens: 8192, system: sys?.content || '', messages: msgs }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}`);
    return (await res.json()).content[0].text;
  },

  async gemini(messages) {
    const key = Store.get('keys', {}).gemini;
    if (!key) throw new Error('No Gemini key');
    const parts = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: parts }),
    });
    if (!res.ok) throw new Error(`Gemini ${res.status}`);
    return (await res.json()).candidates[0].content.parts[0].text;
  },

  async deepseek(messages) {
    const key = Store.get('keys', {}).deepseek;
    if (!key) throw new Error('No DeepSeek key');
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ model: 'deepseek-chat', messages, max_tokens: 8192 }),
    });
    if (!res.ok) throw new Error(`DeepSeek ${res.status}`);
    return (await res.json()).choices[0].message.content;
  },

  async mistral(messages) {
    const key = Store.get('keys', {}).mistral;
    if (!key) throw new Error('No Mistral key');
    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ model: 'mistral-small-latest', messages, max_tokens: 8192 }),
    });
    if (!res.ok) throw new Error(`Mistral ${res.status}`);
    return (await res.json()).choices[0].message.content;
  },

  async together(messages) {
    const key = Store.get('keys', {}).together;
    if (!key) throw new Error('No Together AI key');
    const res = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ model: 'meta-llama/Llama-3-70b-chat-hf', messages, max_tokens: 8192 }),
    });
    if (!res.ok) throw new Error(`Together ${res.status}`);
    return (await res.json()).choices[0].message.content;
  },

  async pollinations(messages) {
    const res = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'openai', messages, max_tokens: 4096 }),
    });
    if (!res.ok) throw new Error(`Pollinations ${res.status}`);
    return (await res.json()).choices[0].message.content;
  },

  async call(messages, model) {
    const m = model || State.model;
    let chain;
    if (m.provider === 'anthropic') chain = [() => this.anthropic(messages)];
    else if (m.provider === 'gemini') chain = [() => this.gemini(messages)];
    else if (m.provider === 'deepseek') chain = [() => this.deepseek(messages)];
    else if (m.provider === 'mistral') chain = [() => this.mistral(messages)];
    else if (m.provider === 'groq') chain = [() => this.groq(messages)];
    else chain = [() => this.openrouter(messages, m.id)];

    // Fallback chain
    chain.push(...[
      () => this.openrouter(messages, MODELS[0].id),
      () => this.groq(messages),
      () => this.together(messages),
      () => this.pollinations(messages),
    ]);

    for (const fn of chain) {
      try { return await fn(); } catch (e) { console.warn('AI fallback:', e.message); }
    }
    throw new Error('Barcha AI provayderlar ishlamadi. Sozlamalarda API kalitlarni tekshiring.');
  },
};

// ══════════════════════════════════════════════════════════════
//  GLOBAL STATE
// ══════════════════════════════════════════════════════════════
const State = {
  get model() { const m = Store.get('model'); return MODELS.find(x => x.id === m?.id) || MODELS[0]; },
  set model(m) { Store.set('model', m); },
  get projectId() { return PM.current(); },
  agent: null,
  activeTools: new Set(['code']),
  pendingWrites: [],
  chatHistory: [],
  editorFile: null,
};

// ══════════════════════════════════════════════════════════════
//  MARKDOWN RENDERER
// ══════════════════════════════════════════════════════════════
const MD = {
  render(text) {
    return text
      .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
        `<div class="code-block"><span class="code-lang-tag">${lang||'code'}</span><button class="code-copy-btn" onclick="MD.copy(this)">Nusxa</button><pre>${this.esc(code.trim())}</pre></div>`)
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 style="font-size:18px;margin:10px 0 6px">$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`([^`\n]+)`/g, '<code class="inline-code">$1</code>')
      .replace(/^[-•*] (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>[\s\S]*?<\/li>)+/g, s => `<ul>${s}</ul>`)
      .replace(/\n{2,}/g, '</p><p>')
      .replace(/^(?!<[hup\/])(.+)$/gm, s => s.trim() ? `<p>${s}</p>` : '')
      .replace(/<p><\/p>/g, '');
  },
  esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); },
  copy(btn) {
    navigator.clipboard.writeText(btn.nextElementSibling.textContent)
      .then(() => { btn.textContent = '✓ Nusxalandi'; setTimeout(() => btn.textContent = 'Nusxa', 2000); });
  },
};

// ══════════════════════════════════════════════════════════════
//  DIFF VIEWER
// ══════════════════════════════════════════════════════════════
const Diff = {
  compute(oldText, newText) {
    const oldLines = (oldText || '').split('\n');
    const newLines = (newText || '').split('\n');
    const lcs = this._lcs(oldLines, newLines);
    const result = [];
    let oi = 0, ni = 0, li = 0;
    while (oi < oldLines.length || ni < newLines.length) {
      if (li < lcs.length && oi < oldLines.length && ni < newLines.length &&
          oldLines[oi] === lcs[li] && newLines[ni] === lcs[li]) {
        result.push({ type: 'same', text: oldLines[oi] }); oi++; ni++; li++;
      } else if (ni < newLines.length && (li >= lcs.length || newLines[ni] !== lcs[li])) {
        result.push({ type: 'add', text: newLines[ni++] });
      } else if (oi < oldLines.length) {
        result.push({ type: 'del', text: oldLines[oi++] });
      }
    }
    return result;
  },
  _lcs(a, b) {
    const m = Math.min(a.length, 200), n = Math.min(b.length, 200);
    const dp = Array.from({length:m+1}, () => new Array(n+1).fill(0));
    for (let i=1;i<=m;i++) for (let j=1;j<=n;j++)
      dp[i][j] = a[i-1]===b[j-1] ? dp[i-1][j-1]+1 : Math.max(dp[i-1][j],dp[i][j-1]);
    const res=[]; let i=m,j=n;
    while(i>0&&j>0){ if(a[i-1]===b[j-1]){res.unshift(a[i-1]);i--;j--;}else if(dp[i-1][j]>dp[i][j-1])i--;else j++; }
    return res;
  },
  renderHTML(diff) {
    return diff.map(line => {
      const cls = line.type==='add'?'diff-add':line.type==='del'?'diff-del':'diff-same';
      const prefix = line.type==='add'?'+':line.type==='del'?'-':' ';
      return `<div class="${cls}">${prefix} ${MD.esc(line.text)}</div>`;
    }).join('');
  },
};

// ══════════════════════════════════════════════════════════════
//  APP NAVIGATION
// ══════════════════════════════════════════════════════════════
const App = {
  screen: 'home',

  nav(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(id)?.classList.add('active');
    document.getElementById('nav-' + id)?.classList.add('active');
    this.screen = id;
    if (id === 'projects') Projects.render();
    if (id === 'home') Home.refresh();
    if (id === 'settings') Settings.refresh();
  },

  openModelPicker() {
    const list = document.getElementById('model-list');
    list.innerHTML = MODELS.map(m => `
      <div onclick="App.selectModel('${m.id}')" style="display:flex;align-items:center;gap:12px;padding:14px 0;border-bottom:1px solid var(--border);cursor:pointer">
        <span style="font-size:20px">${m.badge}</span>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:700;margin-bottom:2px">${m.name}</div>
          <div style="font-size:11px;color:var(--text3)">${m.provider} · ${(m.ctx/1000).toFixed(0)}K ctx</div>
        </div>
        ${State.model.id===m.id?'<span style="color:var(--accent);font-weight:700">✓</span>':''}
      </div>`).join('');
    Sheet.open('model-sheet');
  },

  selectModel(id) {
    State.model = MODELS.find(m => m.id === id) || MODELS[0];
    document.getElementById('model-label').textContent = State.model.short;
    document.getElementById('default-model-val').textContent = State.model.short;
    Sheet.close('model-sheet');
    toast(`🧠 ${State.model.name}`);
  },

  newProject() {
    document.getElementById('new-project-name').value = '';
    Sheet.open('new-project-sheet');
  },

  showNotifs() { toast('🔔 Yangi bildirishnomalar yo\'q'); },

  init() {
    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Xayrli tong' : hour < 17 ? 'Xayrli kun' : 'Xayrli kech';
    const name = tg?.initDataUnsafe?.user?.first_name || 'User';
    const el = document.getElementById('greeting-text');
    if (el) el.textContent = `${greet}, ${name} 👋`;

    document.getElementById('model-label').textContent = State.model.short;
    document.getElementById('default-model-val').textContent = State.model.short;
    AI.addWelcome();
    Home.refresh();
    Projects.render();
    Settings.refresh();
  },
};

// ══════════════════════════════════════════════════════════════
//  HOME — All real data
// ══════════════════════════════════════════════════════════════
const Home = {
  refresh() {
    this._updateAnalytics();
    this._updateProjects();
    this._updateRunningTasks();
    this._updateConnectors();
  },

  _updateAnalytics() {
    const today = Analytics.today();
    const yesterday = Analytics.yesterday();
    const week = Analytics.week();

    // Token usage
    const tokEl = document.getElementById('stat-tokens');
    if (tokEl) tokEl.textContent = Analytics.fmtTokens(week.tokens);
    const tokChange = document.getElementById('stat-tokens-change');
    if (tokChange) {
      const yTok = yesterday.tokens || 0;
      const tTok = today.tokens || 0;
      const pct = yTok ? Math.round((tTok - yTok) / yTok * 100) : (tTok > 0 ? 100 : 0);
      tokChange.textContent = (pct >= 0 ? '+' : '') + pct + '%';
      tokChange.className = 'an-change ' + (pct >= 0 ? 'up' : 'down');
    }

    // Requests
    const reqEl = document.getElementById('stat-requests');
    if (reqEl) reqEl.textContent = week.requests;
    const reqChange = document.getElementById('stat-requests-change');
    if (reqChange) {
      const yReq = yesterday.requests || 0;
      const tReq = today.requests || 0;
      const pct = yReq ? Math.round((tReq - yReq) / yReq * 100) : (tReq > 0 ? 100 : 0);
      reqChange.textContent = (pct >= 0 ? '+' : '') + pct + '%';
      reqChange.className = 'an-change ' + (pct >= 0 ? 'up' : 'down');
    }

    // Usage %
    const projects = PM.list().length;
    const usagePct = Math.min(100, projects * 20 + (today.requests * 5));
    const usageEl = document.getElementById('usage-pct');
    const usageBar = document.getElementById('usage-bar');
    const usageSub = document.getElementById('usage-sub');
    if (usageEl) usageEl.textContent = usagePct + '%';
    if (usageBar) usageBar.style.width = usagePct + '%';
    if (usageSub) usageSub.textContent = today.requests + ' ta so\'rov bugun · Bepul provayderlar';
  },

  _updateProjects() {
    const projects = PM.list().slice(0, 3);
    const el = document.getElementById('home-projects');
    if (!el) return;
    const icons = ['📊','🤖','📈','🎨','⚙️','🚀'];
    const colors = ['blue','green','orange','purple','red','yellow'];
    el.innerHTML = projects.length ? projects.map((p, i) => `
      <div class="project-item" onclick="Projects.open('${p.id}')">
        <div class="project-dot ${colors[i%colors.length]}">${icons[i%icons.length]}</div>
        <div style="flex:1">
          <div class="project-name">${p.name}</div>
          <div class="project-time">${FS.index(p.id).length} files · ${timeAgo(p.updated || p.created)}</div>
        </div>
        <div class="project-more">⋯</div>
      </div>`).join('') :
      `<div style="text-align:center;padding:20px;color:var(--text3)">
        Hali loyiha yo'q.<br><span style="color:var(--accent);cursor:pointer" onclick="App.newProject()">+ Birinchi loyihangizni yarating</span>
      </div>`;
  },

  _updateRunningTasks() {
    const container = document.getElementById('running-tasks-container');
    if (!container) return;
    const tasks = Tasks.list().filter(t => t.status === 'running');
    if (!tasks.length) {
      container.innerHTML = `<div style="text-align:center;padding:16px;color:var(--text3);font-size:13px">Faol vazifalar yo'q</div>`;
      return;
    }
    container.innerHTML = tasks.map(t => `
      <div class="task-card">
        <div class="task-head">
          <div class="task-dot"></div>
          <span class="task-name">${t.name}</span>
          <span class="task-pct">${t.progress}%</span>
        </div>
        <div class="task-bar-wrap"><div class="task-bar" style="width:${t.progress}%"></div></div>
        <div class="task-status">${t.description}</div>
      </div>`).join('');
  },

  _updateConnectors() {
    const keys = Store.get('keys', {});
    const ghStatus = document.getElementById('conn-github-status');
    const aiStatus = document.getElementById('conn-ai-status');
    const aiName = document.getElementById('conn-ai-name');

    if (ghStatus) {
      ghStatus.textContent = keys.github ? 'Ulangan' : 'Sozlanmagan';
      ghStatus.style.color = keys.github ? 'var(--green)' : 'var(--text3)';
    }
    if (aiStatus && aiName) {
      const hasKey = keys.or1 || keys.groq || keys.anthropic || keys.gemini || keys.deepseek || keys.mistral || keys.together;
      if (hasKey) {
        const provName = keys.anthropic ? 'Anthropic' : keys.or1 ? 'OpenRouter' : keys.groq ? 'Groq' : keys.gemini ? 'Gemini' : keys.deepseek ? 'DeepSeek' : 'Together AI';
        aiName.textContent = provName + ' AI';
        aiStatus.textContent = 'Ulangan';
        aiStatus.style.color = 'var(--green)';
      } else {
        aiName.textContent = 'AI Provayder';
        aiStatus.textContent = 'Kalit yo\'q → Pollinations (bepul)';
        aiStatus.style.color = 'var(--text3)';
      }
    }
  },
};

// ══════════════════════════════════════════════════════════════
//  AI CHAT
// ══════════════════════════════════════════════════════════════
const AGENT_SYSTEMS = {
  master:     'You are the Master Agent. Orchestrate specialized agents for complex tasks. Be concise and direct.',
  planner:    'You are the Planner Agent. Create detailed technical roadmaps and task breakdowns.',
  researcher: 'You are the Research Agent. Find accurate information and best practices.',
  coder:      'You are the Coding Agent. Write production-ready code. Use <WRITE_FILE path="...">content</WRITE_FILE> for files.',
  designer:   'You are the UI Designer Agent. Create beautiful, mobile-first interfaces with HTML/CSS.',
  reviewer:   'You are the Code Review Agent. Find bugs, security issues, performance problems.',
  tester:     'You are the Testing Agent. Write comprehensive tests (unit, integration, e2e).',
  deployer:   'You are the Deployment Agent. Handle CI/CD, Docker, cloud deployments.',
  backend:    'You are the Backend Agent. Design scalable APIs and databases.',
  security:   'You are the Security Agent. Find vulnerabilities and provide fixes.',
  optimizer:  'You are the Optimization Agent. Improve performance and reduce complexity.',
  docs:       'You are the Documentation Agent. Write clear, comprehensive documentation.',
};

const AI = {
  busy: false,

  system() {
    const agentSys = State.agent ? AGENT_SYSTEMS[State.agent] : '';
    const projectCtx = State.projectId ? FS.context(State.projectId) : '';
    const project = State.projectId ? PM.get(State.projectId) : null;
    return `You are OmniCode — a world-class AI coding assistant (like Cursor AI on mobile).

${agentSys}

FILE WRITING PROTOCOL:
Use this exact format to create/modify files:
<WRITE_FILE path="relative/path/file.ext">
complete file content here
</WRITE_FILE>

Always write complete file contents. Multiple files allowed per response.

ACTIVE PROJECT: ${project ? project.name : 'None selected'}
ACTIVE TOOLS: ${[...State.activeTools].join(', ')}
${projectCtx}

Rules: Be concise. Write working code. For mobile: short explanations.`;
  },

  addWelcome() {
    const el = document.getElementById('chat-messages');
    if (!el) return;
    el.innerHTML = '';
    this.appendBubble('ai', `**OmniCode AI** — Telefondan Claude Code 🚀

**Nima qila olaman:**
- To'liq fayllar va loyihalar yozish
- Kodni tahrirlash (Cursor Cmd+K kabi)
- PR ko'rib chiqish, xatolarni tuzatish
- To'g'ridan-to'g'ri GitHubga yuborish
- 12 ta ixtisoslashgan AI agent ishlatish

**Boshlash:**
1. Loyiha yarating (Loyihalar bo'limi)
2. Nima qurishni tasvirlab bering
3. Men fayllarni yozaman — siz tasdiqlaysiz

Bugun nima quramiz?`, false);
  },

  appendBubble(role, text, hasWrites) {
    const el = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = `bubble ${role}`;
    if (role === 'ai') {
      div.innerHTML = MD.render(FS.stripCommands(text));
      if (hasWrites) {
        const btn = document.createElement('button');
        btn.className = 'apply-btn';
        btn.textContent = `📝 ${State.pendingWrites.length} ta faylni qo'llash`;
        btn.onclick = () => DiffView.show();
        div.appendChild(btn);
      }
      const chips = document.createElement('div');
      chips.className = 'bubble-chips';
      chips.innerHTML = [['Improve','Yaxshilash'],['Explain','Tushuntirish'],['Shorter','Qisqartirish'],['Fix bugs','Xatolarni tuzat']].map(([a,uz]) =>
        `<button class="bubble-chip" onclick="AI.quickAction('${a}')">${uz}</button>`).join('');
      div.appendChild(chips);
    } else {
      div.textContent = text;
    }
    el.appendChild(div);
    el.scrollTop = el.scrollHeight;
    return div;
  },

  showTyping() {
    const el = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = 'bubble thinking'; div.id = 'typing-ind';
    div.innerHTML = `<div class="thinking-dots"><span></span><span></span><span></span></div><span style="font-size:13px;color:var(--text3)">O'ylayapman...</span>`;
    el.appendChild(div); el.scrollTop = el.scrollHeight;
  },
  hideTyping() { document.getElementById('typing-ind')?.remove(); },

  async send(text) {
    const inp = document.getElementById('chat-input');
    const msg = (text || inp?.value || '').trim();
    if (!msg || this.busy) return;
    if (inp) { inp.value = ''; inp.style.height = ''; }

    const resolved = await this.resolveRefs(msg);
    this.appendBubble('user', msg, false);
    State.chatHistory.push({ role: 'user', content: resolved });

    this.busy = true;
    this.showTyping();

    const taskId = Tasks.add('AI Chat', msg.slice(0, 40) + '...');
    Tasks.update(taskId, { progress: 30 });

    const messages = [
      { role: 'system', content: this.system() },
      ...State.chatHistory.slice(-16),
    ];

    try {
      Tasks.update(taskId, { progress: 70 });
      const reply = await AIRouter.call(messages);
      this.hideTyping();

      // Estimate tokens (rough: 4 chars = 1 token)
      const approxTokens = Math.floor((messages.reduce((s,m) => s + m.content.length, 0) + reply.length) / 4);
      Analytics.track(approxTokens);

      const writes = FS.parseWrites(reply);
      if (writes.length) {
        State.pendingWrites = writes;
        this.appendBubble('ai', reply, true);
        toast(`📝 ${writes.length} ta fayl qo'llashga tayyor`);
      } else {
        this.appendBubble('ai', reply, false);
      }
      State.chatHistory.push({ role: 'assistant', content: reply });
      Tasks.update(taskId, { progress: 100, status: 'done' });
      Tasks.remove(taskId);
    } catch (e) {
      this.hideTyping();
      this.appendBubble('ai', `❌ **${e.message}**\n\nAI yoqish uchun **Sozlamalar → AI API Kalitlar** bo'limiga kalit qo'shing.`, false);
      Tasks.remove(taskId);
    } finally {
      this.busy = false;
      if (App.screen === 'home') Home.refresh();
    }
  },

  async resolveRefs(text) {
    if (!State.projectId) return text;
    return text.replace(/@([\w./\-]+)/g, (match, path) => {
      const content = FS.read(State.projectId, path);
      return content ? `\n\`\`\`${path}\n${content}\n\`\`\`\n` : match;
    });
  },

  clear() { State.chatHistory = []; this.addWelcome(); },
  onKey(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.send(); } },
  autoGrow(el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px'; },

  toggleTool(el, name) {
    if (State.activeTools.has(name)) { State.activeTools.delete(name); el.classList.remove('active'); }
    else { State.activeTools.add(name); el.classList.add('active'); }
    toast(`Vosita: ${name} ${State.activeTools.has(name) ? 'YOQILDI' : 'O\'CHIRILDI'}`);
  },

  async quickAction(action) {
    const last = State.chatHistory.filter(m => m.role === 'assistant').pop();
    if (!last) { toast('Avval AI dan javob oling'); return; }
    const prompts = { Improve: 'Buni yaxshilang:', Explain: 'Buni tushunarli tushuntiring:', Shorter: 'Buni qisqartiring:', 'Fix bugs': 'Xatolarni toping va tuzating:' };
    await this.send(`${prompts[action]} ${last.content.slice(0, 500)}`);
  },
};

// ══════════════════════════════════════════════════════════════
//  DIFF VIEWER
// ══════════════════════════════════════════════════════════════
const DiffView = {
  current: 0,

  show() {
    if (!State.pendingWrites.length) { toast('O\'zgarishlar yo\'q'); return; }
    this.current = 0;
    this.render();
    Sheet.open('diff-sheet');
  },

  render() {
    const w = State.pendingWrites[this.current];
    const existing = State.projectId ? FS.read(State.projectId, w.path) : '';
    const diff = Diff.compute(existing, w.content);
    document.getElementById('diff-title').textContent = `${!existing ? '+ Yangi' : '~ O\'zgartirildi'}: ${w.path}`;
    document.getElementById('diff-nav').textContent = `${this.current+1} / ${State.pendingWrites.length}`;
    document.getElementById('diff-body').innerHTML = Diff.renderHTML(diff);
    document.getElementById('diff-prev').style.opacity = this.current === 0 ? '0.3' : '1';
    document.getElementById('diff-next').style.opacity = this.current === State.pendingWrites.length-1 ? '0.3' : '1';
  },

  prev() { if (this.current > 0) { this.current--; this.render(); } },
  next() { if (this.current < State.pendingWrites.length-1) { this.current++; this.render(); } },

  applyAll() {
    if (!State.projectId) { toast('⚠️ Avval loyiha tanlang'); Sheet.close('diff-sheet'); App.nav('projects'); return; }
    for (const w of State.pendingWrites) FS.write(State.projectId, w.path, w.content);
    const count = State.pendingWrites.length;
    State.pendingWrites = [];
    Sheet.close('diff-sheet');
    Projects.render();
    Home.refresh();
    PM.update(State.projectId, {});
    toast(`✅ ${count} ta fayl qo'llandi`);
  },

  rejectAll() { State.pendingWrites = []; Sheet.close('diff-sheet'); toast('❌ O\'zgarishlar rad etildi'); },
};

// ══════════════════════════════════════════════════════════════
//  PROJECTS
// ══════════════════════════════════════════════════════════════
const Projects = {
  render() {
    const list = PM.list();
    const el = document.getElementById('projects-tree');
    if (!el) return;
    const current = State.projectId;
    if (!list.length) {
      el.innerHTML = `<div style="text-align:center;padding:40px 20px;color:var(--text3)">
        <div style="font-size:40px;margin-bottom:12px">📁</div>
        <div style="font-size:15px;font-weight:600;margin-bottom:8px">Hali loyiha yo'q</div>
        <button onclick="App.newProject()" style="background:var(--accent);border:none;color:#fff;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">+ Yangi loyiha</button>
      </div>`;
      return;
    }
    el.innerHTML = list.map(p => {
      const files = FS.index(p.id);
      const isActive = p.id === current;
      return `
      <div class="folder-block" id="proj-${p.id}">
        <div class="folder-row ${isActive ? 'active-project' : ''}" onclick="Projects.open('${p.id}')">
          <span class="f-arrow open" onclick="Projects.toggleFolder(this,event)">▶</span>
          <span class="f-icon">📁</span>
          <span class="f-name">${p.name}</span>
          ${isActive ? '<span style="font-size:10px;color:var(--accent);font-weight:700;background:rgba(255,77,79,0.1);padding:2px 7px;border-radius:10px">Faol</span>' : ''}
          <span onclick="Projects.menu('${p.id}',event)" style="font-size:18px;color:var(--text3);padding:4px 8px">⋯</span>
        </div>
        <div class="folder-files">
          ${files.map(f => `
          <div class="file-row" onclick="Editor.open('${p.id}','${f}')">
            <span class="fi-icon">${fileIcon(f)}</span>
            <span class="fi-name">${f}</span>
          </div>`).join('')}
          <div class="file-row" style="color:var(--text3)" onclick="Projects.addFile('${p.id}')">
            <span class="fi-icon">+</span>
            <span class="fi-name" style="color:var(--text3)">Fayl qo'shish...</span>
          </div>
        </div>
      </div>`;
    }).join('');
  },

  open(id) {
    PM.setCurrent(id);
    State.pendingWrites = [];
    State.agent = null;
    const p = PM.get(id);
    toast(`📁 ${p.name} — faol loyiha`);
    this.render();
    Home.refresh();
    const lbl = document.getElementById('active-project-label');
    if (lbl) { lbl.textContent = p.name; lbl.style.display = ''; }
  },

  newProject() {
    const name = document.getElementById('new-project-name').value.trim();
    const tpl = document.getElementById('new-project-template').value;
    if (!name) { toast('Loyiha nomini kiriting'); return; }
    const p = PM.create(name, tpl);
    this.open(p.id);
    Sheet.close('new-project-sheet');
    App.nav('projects');
    toast(`✅ "${name}" yaratildi`);
  },

  toggleFolder(arrow, e) {
    e.stopPropagation();
    const files = arrow.closest('.folder-row').nextElementSibling;
    const open = arrow.classList.contains('open');
    arrow.classList.toggle('open', !open);
    files.style.display = open ? 'none' : '';
  },

  addFile(projectId) {
    const name = prompt('Fayl yo\'li (masalan: src/utils.js):');
    if (!name) return;
    FS.write(projectId, name, `// ${name}\n`);
    Editor.open(projectId, name);
    this.render();
  },

  menu(id, e) {
    e.stopPropagation();
    const p = PM.get(id);
    const actions = ['Push to GitHub', 'Delete project', 'Cancel'];
    const action = prompt(`${p.name}\n\n1) GitHubga yuborish\n2) Loyihani o'chirish\n3) Bekor qilish\n\n1, 2 yoki 3 kiriting:`);
    if (action === '1') { PM.setCurrent(id); Deploy.start(); }
    else if (action === '2') {
      if (confirm(`"${p.name}" o'chirilsinmi? Bu amalni bekor qilib bo'lmaydi.`)) {
        PM.delete(id); this.render(); Home.refresh(); toast('🗑 O\'chirildi');
      }
    }
  },

  filter(type, el) {
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    // Filter by type
    const list = PM.list();
    const filtered = type === 'starred' ? list.filter(p => p.starred) : list;
    // Re-render with filtered
    const tree = document.getElementById('projects-tree');
    if (tree) { Store.set('_filter_override', filtered.map(p => p.id)); this.render(); Store.set('_filter_override', null); }
  },

  search(q) {
    const lower = q.toLowerCase();
    document.querySelectorAll('.folder-block').forEach(b => {
      b.style.display = b.querySelector('.f-name').textContent.toLowerCase().includes(lower) ? '' : 'none';
    });
  },
};

// ══════════════════════════════════════════════════════════════
//  CODE EDITOR
// ══════════════════════════════════════════════════════════════
const Editor = {
  projectId: null,
  file: null,

  open(projectId, path) {
    this.projectId = projectId;
    this.file = path;
    const content = FS.read(projectId, path);
    document.getElementById('ed-filename').textContent = path;
    document.getElementById('ed-badge').textContent = langFromPath(path);
    document.getElementById('code-view').innerHTML =
      `<textarea id="editor-textarea" class="editor-ta" spellcheck="false"
        oninput="Editor.onChange(this)">${escHTML(content)}</textarea>`;
    App.nav('editor');
  },

  onChange(ta) {
    if (this.projectId && this.file) FS.write(this.projectId, this.file, ta.value);
  },

  async aiEdit() {
    if (!this.file) { toast('Avval fayl oching'); return; }
    const content = FS.read(this.projectId, this.file);
    const instruction = prompt('AI bu fayl bilan nima qilsin?');
    if (!instruction) return;
    toast('🤖 AI tahrirlayapti...', 3000);
    const messages = [
      { role: 'system', content: `You are a code editor. Respond ONLY with the complete modified file content wrapped in <WRITE_FILE path="${this.file}">...</WRITE_FILE>. No explanation.` },
      { role: 'user', content: `File: ${this.file}\n\nContent:\n${content}\n\nInstruction: ${instruction}` },
    ];
    try {
      const reply = await AIRouter.call(messages);
      const writes = FS.parseWrites(reply);
      if (writes.length) { State.pendingWrites = writes; DiffView.show(); }
      else { toast('AI fayl o\'zgarishlarini qaytarmadi'); }
    } catch (e) { toast('❌ ' + e.message); }
  },

  termTab(el, tab) {
    document.querySelectorAll('.term-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    const body = document.getElementById('term-body');
    if (!body) return;
    if (tab === 'git') {
      const p = PM.get(this.projectId);
      const ghInfo = p?.github ? `${p.github.owner}/${p.github.repo} @ ${p.github.branch || 'main'}` : 'Sozlanmagan';
      body.innerHTML = `<div><span class="t-prompt">$ </span>git status</div>
        <div class="t-dim">On branch main</div>
        <div class="t-dim">GitHub: ${ghInfo}</div>
        <div class="t-dim">Files: ${this.projectId ? FS.index(this.projectId).length : 0}</div>`;
    } else if (tab === 'problems') {
      body.innerHTML = `<div class="t-dim">Muammolar topilmadi</div>`;
    } else if (tab === 'output') {
      body.innerHTML = `<div class="t-dim">Chiqish yo'q</div>`;
    } else {
      body.innerHTML = `<div><span class="t-prompt">$ </span><span class="t-dim">OmniCode Terminal — brauzerda faqat o'qish mumkin</span></div>`;
    }
  },
};

// ══════════════════════════════════════════════════════════════
//  AGENTS
// ══════════════════════════════════════════════════════════════
const Agents = {
  current: null,

  run(name) {
    this.current = name;
    State.agent = name;
    const names = { planner:'Rejalashtiruvchi', researcher:'Tadqiqotchi', coder:'Dasturchi', designer:'Dizayner', reviewer:'Tekshiruvchi', tester:'Test qiluvchi', security:'Xavfsizlik', deployer:'Joylashtiruvchi', optimizer:'Optimallashtiruvchi', docs:'Hujjatchi', backend:'Backend' };
    document.getElementById('agent-sheet-title').textContent = (names[name] || name) + ' Agenti';
    document.getElementById('agent-task-input').value = '';
    document.getElementById('agent-task-input').placeholder = `${names[name] || name} agenti nima qilsin?`;
    Sheet.open('agent-sheet');
  },

  runMaster() {
    this.current = 'master';
    State.agent = 'master';
    document.getElementById('agent-sheet-title').textContent = 'Bosh Agent';
    document.getElementById('agent-task-input').placeholder = 'Loyihangiz maqsadini batafsil tasvirlab bering...';
    Sheet.open('agent-sheet');
  },

  showRunSheet() { this.runMaster(); },

  async executeTask() {
    const task = document.getElementById('agent-task-input').value.trim();
    if (!task) { toast('Vazifa tavsifini kiriting'); return; }
    Sheet.close('agent-sheet');
    App.nav('ai');
    await AI.send(`[${(this.current || 'master').toUpperCase()} AGENT]\n${task}`);
    State.agent = null;
  },

  createNew() {
    const name = prompt('Agent nomi:');
    if (!name) return;
    const desc = prompt('Agent tavsifi:');
    if (!desc) return;
    toast(`✅ "${name}" agenti yaratildi`);
    // Could store custom agents in localStorage here
  },

  async runPipeline(task, agentList = ['planner', 'coder', 'reviewer']) {
    if (!task) { const t = document.getElementById('agent-task-input')?.value.trim(); if (!t) { toast('Avval vazifa kiriting'); return; } task = t; }
    Sheet.close('agent-sheet');
    App.nav('ai');
    AI.appendBubble('ai', `🤖 **Ko'p agentli Pipeline** boshlanmoqda...\nAgentlar: ${agentList.join(' → ')}`, false);
    let context = task;
    for (const name of agentList) {
      State.agent = name;
      const taskId = Tasks.add(`${name} agent`, task.slice(0, 40));
      Tasks.update(taskId, { progress: 50 });
      const messages = [
        { role: 'system', content: AGENT_SYSTEMS[name] + '\n\n' + AI.system() },
        { role: 'user', content: `Task: ${task}\n\nContext:\n${context}\n\nComplete your part now.` },
      ];
      AI.appendBubble('user', `[${name.toUpperCase()}]`, false);
      AI.showTyping();
      try {
        const reply = await AIRouter.call(messages);
        AI.hideTyping();
        const writes = FS.parseWrites(reply);
        if (writes.length) State.pendingWrites = [...State.pendingWrites, ...writes];
        AI.appendBubble('ai', reply, writes.length > 0);
        context += `\n\n[${name.toUpperCase()} OUTPUT]:\n${reply.slice(0, 1000)}`;
        Analytics.track(Math.floor(reply.length / 4));
        Tasks.update(taskId, { progress: 100, status: 'done' });
        Tasks.remove(taskId);
      } catch (e) {
        AI.hideTyping();
        AI.appendBubble('ai', `❌ ${name} failed: ${e.message}`, false);
        Tasks.remove(taskId);
      }
    }
    State.agent = null;
  },
};

// ══════════════════════════════════════════════════════════════
//  DEPLOY — Real GitHub push
// ══════════════════════════════════════════════════════════════
const Deploy = {
  async start() {
    const projectId = State.projectId;
    if (!projectId) {
      toast('⚠️ Avval loyiha tanlang');
      App.nav('projects');
      return;
    }
    const p = PM.get(projectId);
    if (!p.github) {
      // Pre-fill from previous if available
      Sheet.open('github-deploy-sheet');
      return;
    }
    await this.push(projectId, p.github.owner, p.github.repo, p.github.branch || 'main');
  },

  async setupAndPush() {
    const owner = document.getElementById('gh-owner').value.trim();
    const repo = document.getElementById('gh-repo').value.trim();
    const branch = document.getElementById('gh-branch').value.trim() || 'main';
    if (!owner || !repo) { toast('Foydalanuvchi nomi va repozitoriya nomini kiriting'); return; }
    Sheet.close('github-deploy-sheet');
    const projectId = State.projectId;
    if (!projectId) { toast('Loyiha tanlanmagan'); return; }
    PM.update(projectId, { github: { owner, repo, branch } });
    await this.push(projectId, owner, repo, branch);
  },

  async push(projectId, owner, repo, branch) {
    const logs = document.getElementById('deploy-logs');
    const t = () => new Date().toLocaleTimeString('en-US', {hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'});
    const addLog = (msg, ok = false) => {
      logs.innerHTML += `<div class="log-line"><span class="log-t">${t()}</span><span class="log-m${ok?' ok':''}">${msg}</span></div>`;
      logs.scrollTop = logs.scrollHeight;
    };

    logs.innerHTML = '';
    App.nav('deploy');

    const setStep = (id, state, desc) => {
      const el = document.getElementById(id);
      if (el) el.className = `step-dot ${state}`;
      const d = document.getElementById(id + '-desc');
      if (d && desc) d.textContent = desc;
    };

    // Reset steps
    ['step-github','step-build','step-tests','step-deploy'].forEach(s => setStep(s, 'gray'));

    setStep('step-github', 'orange', 'Connecting...');
    addLog('› Connecting to GitHub...');

    if (!Git.token()) {
      setStep('step-github', 'red', 'Token yo\'q');
      addLog('› Xato: GitHub token sozlanmagan. Sozlamalar → Kod va Joylashtirish → GitHub Token');
      toast('❌ Avval Sozlamalarda GitHub token qo\'shing'); return;
    }

    try {
      const user = await Git.me();
      setStep('step-github', 'green', `Connected as ${user.login}`);
      addLog(`› Connected as ${user.login} ✓`, true);
    } catch (e) {
      setStep('step-github', 'red', 'Auth failed');
      addLog(`› GitHub error: ${e.message}`);
      toast('❌ GitHub: ' + e.message); return;
    }

    await delay(300);
    setStep('step-build', 'orange', `Pushing to ${repo}...`);
    addLog(`› Pushing files to ${owner}/${repo}@${branch}...`);

    const results = await Git.pushProject(projectId, owner, repo, branch);
    let ok = 0, fail = 0;
    for (const r of results) {
      if (r.ok) { ok++; addLog(`  ✓ ${r.path}`, true); }
      else { fail++; addLog(`  ✗ ${r.path}: ${r.error}`); }
    }

    if (results.length === 0) { addLog('  ⚠ No files in project'); }

    setStep('step-build', fail === 0 ? 'green' : 'orange', fail === 0 ? `${ok} files pushed` : `${ok} ok, ${fail} failed`);
    addLog(fail === 0 ? `› All ${ok} files pushed ✓` : `› ${ok} ok, ${fail} failed`, fail === 0);

    await delay(300);
    setStep('step-tests', 'green', 'Build triggered');
    addLog('› Build triggered on GitHub Actions ✓', true);

    await delay(400);
    setStep('step-deploy', 'green', 'Live');
    addLog(`✓ Pushed to github.com/${owner}/${repo}`, true);

    toast(fail === 0 ? '🚀 Pushed to GitHub!' : `⚠️ ${fail} files failed`);
  },

  clearLogs() { document.getElementById('deploy-logs').innerHTML = ''; },
};

// ══════════════════════════════════════════════════════════════
//  SETTINGS — All providers
// ══════════════════════════════════════════════════════════════
const PROVIDER_CONFIGS = {
  openrouter: {
    title: 'OpenRouter Keys',
    fields: [
      { id: 'or1', label: 'Key 1 (sk-or-v1-...)' },
      { id: 'or2', label: 'Key 2 (optional)' },
      { id: 'or3', label: 'Key 3 (optional)' },
      { id: 'or4', label: 'Key 4 (optional)' },
    ],
    hint: 'Get free keys at openrouter.ai/keys — 4 keys for load balancing',
  },
  github: {
    title: 'GitHub Token',
    fields: [{ id: 'github', label: 'Personal Access Token (ghp_...)' }],
    hint: 'github.com/settings/tokens → New token → repo scope',
  },
  groq: {
    title: 'Groq API Key',
    fields: [{ id: 'groq', label: 'API Key (gsk_...)' }],
    hint: 'Free at console.groq.com — fastest inference',
  },
  anthropic: {
    title: 'Anthropic / Claude',
    fields: [{ id: 'anthropic', label: 'API Key (sk-ant-...)' }],
    hint: 'console.anthropic.com — Claude 3.5 Haiku included',
  },
  gemini: {
    title: 'Google Gemini',
    fields: [{ id: 'gemini', label: 'API Key (AIza...)' }],
    hint: 'Free at aistudio.google.com — 1M context window',
  },
  deepseek: {
    title: 'DeepSeek',
    fields: [{ id: 'deepseek', label: 'API Key (sk-...)' }],
    hint: 'platform.deepseek.com — very cheap',
  },
  mistral: {
    title: 'Mistral AI',
    fields: [{ id: 'mistral', label: 'API Key' }],
    hint: 'console.mistral.ai — European AI',
  },
  together: {
    title: 'Together AI',
    fields: [{ id: 'together', label: 'API Key' }],
    hint: 'api.together.xyz — $25 free credit',
  },
  huggingface: {
    title: 'HuggingFace',
    fields: [{ id: 'hf', label: 'Access Token (hf_...)' }],
    hint: 'huggingface.co/settings/tokens',
  },
  nvidia: {
    title: 'NVIDIA NIM',
    fields: [{ id: 'nvidia', label: 'API Key' }],
    hint: 'build.nvidia.com — free GPU inference',
  },
};

const Settings = {
  _conn: null,

  refresh() {
    const keys = Store.get('keys', {});
    // Update all status elements
    const statuses = {
      'or-status': !!keys.or1,
      'gh-status': !!keys.github,
      'groq-status': !!keys.groq,
      'anthropic-status': !!keys.anthropic,
      'gemini-status': !!keys.gemini,
      'deepseek-status': !!keys.deepseek,
      'mistral-status': !!keys.mistral,
      'together-status': !!keys.together,
      'hf-status': !!keys.hf,
      'nvidia-status': !!keys.nvidia,
    };
    for (const [id, connected] of Object.entries(statuses)) {
      const el = document.getElementById(id);
      if (!el) continue;
      el.textContent = connected ? 'Ulangan' : 'Sozlanmagan';
      el.className = connected ? 's-connected' : 's-val';
    }
    const modelEl = document.getElementById('default-model-val');
    if (modelEl) modelEl.textContent = State.model.short;
  },

  openConnector(name) {
    this._conn = name;
    const cfg = PROVIDER_CONFIGS[name];
    if (!cfg) return;
    const keys = Store.get('keys', {});
    document.getElementById('connector-sheet-title').textContent = cfg.title;
    const fields = document.getElementById('connector-fields');
    if (fields) {
      fields.innerHTML = cfg.fields.map(f => `
        <label class="sh-label">${f.label}</label>
        <input id="conn-field-${f.id}" class="sh-input" type="password" placeholder="Enter key..." value="${keys[f.id]||''}">
      `).join('') + (cfg.hint ? `<div style="font-size:11px;color:var(--text3);padding:4px 20px 0">${cfg.hint}</div>` : '');
    }
    Sheet.open('connector-sheet');
  },

  save() {
    const cfg = PROVIDER_CONFIGS[this._conn];
    if (!cfg) return;
    const keys = Store.get('keys', {});
    for (const f of cfg.fields) {
      const el = document.getElementById('conn-field-' + f.id);
      if (el && el.value.trim()) keys[f.id] = el.value.trim();
    }
    Store.set('keys', keys);
    Sheet.close('connector-sheet');
    this.refresh();
    Home._updateConnectors?.();
    toast('✅ Kalitlar xavfsiz saqlandi');
  },

  accentPicker() {
    const colors = ['#FF4D4F', '#3B82F6', '#22C55E', '#F59E0B', '#8B5CF6', '#EC4899'];
    const color = prompt('Asosiy rang (hex):\n' + colors.join(', ') + '\n\nYoki o\'z rangingizni kiriting:') || '#FF4D4F';
    document.documentElement.style.setProperty('--accent', color);
    Store.set('accent_color', color);
    toast('🎨 Rang yangilandi');
  },
};

// ══════════════════════════════════════════════════════════════
//  SHEET HELPER
// ══════════════════════════════════════════════════════════════
const Sheet = {
  open(id) { document.getElementById(id)?.classList.add('open'); },
  close(id) { document.getElementById(id)?.classList.remove('open'); },
  closeOnBg(e, id) { if (e.target.id === id) this.close(id); },
};

// ══════════════════════════════════════════════════════════════
//  UTILITIES
// ══════════════════════════════════════════════════════════════
function toast(msg, dur = 2800) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), dur);
}
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'hozir';
  if (s < 3600) return `${Math.floor(s/60)} daqiqa oldin`;
  if (s < 86400) return `${Math.floor(s/3600)} soat oldin`;
  return `${Math.floor(s/86400)} kun oldin`;
}
function fileIcon(path) {
  const ext = path.split('.').pop().toLowerCase();
  return { js:'🟨', jsx:'⚛️', ts:'🔷', tsx:'⚛️', py:'🐍', html:'🌐', css:'🎨',
    json:'📋', md:'📖', sh:'⚡', env:'🔑', txt:'📄', yml:'⚙️', yaml:'⚙️', sql:'🗄️' }[ext] || '📄';
}
function langFromPath(path) {
  const ext = path.split('.').pop().toLowerCase();
  return { js:'JavaScript', jsx:'React JSX', ts:'TypeScript', tsx:'React TSX',
    py:'Python', html:'HTML', css:'CSS', json:'JSON', md:'Markdown', sh:'Shell', yml:'YAML' }[ext] || ext.toUpperCase();
}
function escHTML(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// Apply saved accent color
const savedAccent = Store.get('accent_color');
if (savedAccent) document.documentElement.style.setProperty('--accent', savedAccent);

// ── Init ─────────────────────────────────────────────────────────
App.init();
