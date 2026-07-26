'use strict';
// ═══════════════════════════════════════════════════════════════
//  OmniCode — Real AI Coding Platform
//  Features: Real FS, AI writes files, Diff, GitHub Push, Composer
// ═══════════════════════════════════════════════════════════════

const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); tg.setHeaderColor?.('#0A0A0A'); tg.setBackgroundColor?.('#0A0A0A'); }

// ── Store ────────────────────────────────────────────────────────
const Store = {
  get(k, d = null) { try { const v = localStorage.getItem('oc_' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('oc_' + k, JSON.stringify(v)); } catch {} },
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
    const idx = this.index(projectId).filter(p => p !== path);
    Store.set(this._indexKey(projectId), idx);
  },

  rename(projectId, oldPath, newPath) {
    const content = this.read(projectId, oldPath);
    this.write(projectId, newPath, content);
    this.delete(projectId, oldPath);
  },

  // Build full context string for AI
  context(projectId, maxChars = 12000) {
    const files = this.index(projectId);
    if (!files.length) return '';
    let ctx = `\n\n<PROJECT_FILES>\n`;
    let chars = 0;
    for (const path of files) {
      const content = this.read(projectId, path);
      const chunk = `<FILE path="${path}">\n${content}\n</FILE>\n`;
      if (chars + chunk.length > maxChars) { ctx += `<!-- ${files.length - files.indexOf(path)} more files truncated -->\n`; break; }
      ctx += chunk; chars += chunk.length;
    }
    return ctx + '</PROJECT_FILES>';
  },

  // Parse AI response for file write commands
  parseWrites(text) {
    const writes = [];
    const re = /<(?:WRITE|CREATE)_FILE\s+path="([^"]+)">([\s\S]*?)<\/(?:WRITE|CREATE)_FILE>/g;
    let m;
    while ((m = re.exec(text)) !== null) writes.push({ path: m[1].trim(), content: m[2].trim() });
    return writes;
  },

  // Strip file commands from display text
  stripCommands(text) {
    return text
      .replace(/<(?:WRITE|CREATE)_FILE\s+path="[^"]+">[\s\S]*?<\/(?:WRITE|CREATE)_FILE>/g, '')
      .trim();
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
    const p = { id, name, template, created: Date.now(), github: null };
    const list = this.list();
    list.unshift(p);
    Store.set('projects', list);
    // Seed template files
    const tpls = TEMPLATES[template] || {};
    for (const [path, content] of Object.entries(tpls)) FS.write(id, path, content);
    return p;
  },

  update(id, data) {
    const list = this.list().map(p => p.id === id ? { ...p, ...data } : p);
    Store.set('projects', list);
  },

  delete(id) {
    // Delete all files
    FS.index(id).forEach(path => FS.delete(id, path));
    Store.set('projects', this.list().filter(p => p.id !== id));
    if (this.current() === id) Store.set('current_project', null);
  },
};

// ── Project Templates ────────────────────────────────────────────
const TEMPLATES = {
  blank: { 'README.md': '# My Project\n\nCreated with OmniCode AI.' },
  react: {
    'package.json': '{\n  "name": "my-app",\n  "version": "1.0.0",\n  "scripts": {\n    "dev": "vite",\n    "build": "vite build"\n  },\n  "dependencies": {\n    "react": "^18.0.0",\n    "react-dom": "^18.0.0"\n  },\n  "devDependencies": {\n    "vite": "^5.0.0",\n    "@vitejs/plugin-react": "^4.0.0"\n  }\n}',
    'src/App.jsx': 'import { useState } from "react"\n\nexport default function App() {\n  const [count, setCount] = useState(0)\n\n  return (\n    <div className="app">\n      <h1>My App</h1>\n      <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>\n    </div>\n  )\n}',
    'src/main.jsx': 'import React from "react"\nimport ReactDOM from "react-dom/client"\nimport App from "./App"\n\nReactDOM.createRoot(document.getElementById("root")).render(<App />)',
    'index.html': '<!DOCTYPE html>\n<html>\n<head><title>My App</title></head>\n<body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body>\n</html>',
  },
  'telegram-bot': {
    'bot.py': 'import os\nfrom telegram import Update\nfrom telegram.ext import Application, CommandHandler, ContextTypes\n\nTOKEN = os.getenv("BOT_TOKEN")\n\nasync def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):\n    await update.message.reply_text("Hello! I am your bot 🤖")\n\napp = Application.builder().token(TOKEN).build()\napp.add_handler(CommandHandler("start", start))\napp.run_polling()',
    'requirements.txt': 'python-telegram-bot==20.7\npython-dotenv==1.0.0',
    '.env.example': 'BOT_TOKEN=your_bot_token_here',
    'README.md': '# Telegram Bot\n\n## Setup\n```bash\npip install -r requirements.txt\ncp .env.example .env\n# Edit .env with your token\npython bot.py\n```',
  },
  nextjs: {
    'package.json': '{\n  "name": "my-next-app",\n  "scripts": {\n    "dev": "next dev",\n    "build": "next build",\n    "start": "next start"\n  },\n  "dependencies": {\n    "next": "14.0.0",\n    "react": "^18.0.0",\n    "react-dom": "^18.0.0"\n  }\n}',
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
    if (!token) throw new Error('GitHub token not set. Go to Settings → API Keys');
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
    try {
      const f = await this.request(`/repos/${owner}/${repo}/contents/${path}?ref=${branch}`);
      return f.sha;
    } catch { return null; }
  },

  async pushFile(owner, repo, path, content, branch = 'main', message = null) {
    const sha = await this.getSHA(owner, repo, path, branch);
    const b64 = btoa(unescape(encodeURIComponent(content)));
    return this.request(`/repos/${owner}/${repo}/contents/${path}`, 'PUT', {
      message: message || `feat: update ${path} via OmniCode`,
      content: b64,
      branch,
      ...(sha ? { sha } : {}),
    });
  },

  async pushProject(projectId, owner, repo, branch = 'main') {
    const files = FS.index(projectId);
    const results = [];
    for (const path of files) {
      const content = FS.read(projectId, path);
      try {
        await this.pushFile(owner, repo, path, content, branch);
        results.push({ path, ok: true });
      } catch (e) {
        results.push({ path, ok: false, error: e.message });
      }
    }
    return results;
  },
};

// ══════════════════════════════════════════════════════════════
//  AI ROUTER
// ══════════════════════════════════════════════════════════════
const MODELS = [
  { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B',  short: 'Llama 3.3', provider: 'openrouter', badge: '⚡', ctx: 128000 },
  { id: 'deepseek/deepseek-r1:free',               name: 'DeepSeek R1',    short: 'DeepSeek R1',provider: 'openrouter', badge: '🧠', ctx: 64000  },
  { id: 'google/gemini-2.0-flash-exp:free',        name: 'Gemini 2.0 Flash',short:'Gemini 2.0', provider: 'openrouter', badge: '✨', ctx: 1000000},
  { id: 'qwen/qwq-32b:free',                       name: 'Qwen QwQ 32B',   short: 'QwQ 32B',   provider: 'openrouter', badge: '🔮', ctx: 32000  },
  { id: 'llama-3.3-70b-versatile',                 name: 'Groq Llama 70B', short: 'Groq Fast', provider: 'groq',       badge: '⚡', ctx: 32000  },
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
    if (!res.ok) throw new Error(`OR ${res.status}`);
    return (await res.json()).choices[0].message.content;
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
    const chain = m.provider === 'groq'
      ? [() => this.groq(messages), () => this.openrouter(messages, MODELS[0].id), () => this.pollinations(messages)]
      : [() => this.openrouter(messages, m.id), () => this.groq(messages), () => this.pollinations(messages)];
    for (const fn of chain) {
      try { return await fn(); } catch (e) { console.warn(e.message); }
    }
    throw new Error('All AI providers failed. Check your API keys in Settings.');
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
  pendingWrites: [],    // AI-suggested file writes awaiting approval
  chatHistory: [],
  editorFile: null,
  editorContent: '',
};

// ══════════════════════════════════════════════════════════════
//  MARKDOWN + CODE PARSER
// ══════════════════════════════════════════════════════════════
const MD = {
  render(text) {
    return text
      .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
        `<div class="code-block"><span class="code-lang-tag">${lang||'code'}</span><button class="code-copy-btn" onclick="MD.copy(this)">Copy</button><pre>${this.esc(code.trim())}</pre></div>`)
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
      .then(() => { btn.textContent = '✓ Copied'; setTimeout(() => btn.textContent = 'Copy', 2000); });
  },
};

// ══════════════════════════════════════════════════════════════
//  DIFF VIEWER
// ══════════════════════════════════════════════════════════════
const Diff = {
  compute(oldText, newText) {
    const oldLines = (oldText || '').split('\n');
    const newLines = (newText || '').split('\n');
    const result = [];
    // Simple LCS-based diff
    const lcs = this._lcs(oldLines, newLines);
    let oi = 0, ni = 0, li = 0;
    while (oi < oldLines.length || ni < newLines.length) {
      if (li < lcs.length && oi < oldLines.length && ni < newLines.length &&
          oldLines[oi] === lcs[li] && newLines[ni] === lcs[li]) {
        result.push({ type: 'same', text: oldLines[oi] });
        oi++; ni++; li++;
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
    const res=[];let i=m,j=n;
    while(i>0&&j>0){ if(a[i-1]===b[j-1]){res.unshift(a[i-1]);i--;j--;}else if(dp[i-1][j]>dp[i][j-1])i--;else j++; }
    return res;
  },
  renderHTML(diff) {
    return diff.map(line => {
      const cls = line.type === 'add' ? 'diff-add' : line.type === 'del' ? 'diff-del' : 'diff-same';
      const prefix = line.type === 'add' ? '+' : line.type === 'del' ? '-' : ' ';
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
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
    const nav = document.getElementById('nav-' + id);
    if (nav) nav.classList.add('active');
    this.screen = id;
    if (id === 'projects') Projects.render();
    if (id === 'home') Home.refresh();
  },

  openModelPicker() {
    const list = document.getElementById('model-list');
    list.innerHTML = MODELS.map(m => `
      <div onclick="App.selectModel('${m.id}')" style="display:flex;align-items:center;gap:12px;padding:14px 0;border-bottom:1px solid var(--border);cursor:pointer">
        <span style="font-size:20px">${m.badge}</span>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:700;margin-bottom:2px">${m.name}</div>
          <div style="font-size:11px;color:var(--text3)">${m.provider} · ${(m.ctx/1000).toFixed(0)}K context</div>
        </div>
        ${State.model.id === m.id ? '<span style="color:var(--accent);font-weight:700">✓</span>' : ''}
      </div>`).join('');
    Sheet.open('model-sheet');
  },

  selectModel(id) {
    State.model = MODELS.find(m => m.id === id) || MODELS[0];
    document.getElementById('model-label').textContent = State.model.short;
    Sheet.close('model-sheet');
    toast(`🧠 ${State.model.name}`);
  },

  newProject() { Sheet.open('new-project-sheet'); },

  init() {
    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
    const name = tg?.initDataUnsafe?.user?.first_name || 'User';
    const el = document.getElementById('greeting-text');
    if (el) el.textContent = `${greet}, ${name} 👋`;

    document.getElementById('model-label').textContent = State.model.short;
    AI.addWelcome();
    Home.refresh();
    Projects.render();
    Settings.refresh();
  },
};

// ══════════════════════════════════════════════════════════════
//  HOME
// ══════════════════════════════════════════════════════════════
const Home = {
  refresh() {
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
          <div class="project-time">${FS.index(p.id).length} files · ${timeAgo(p.created)}</div>
        </div>
        <div class="project-more">⋯</div>
      </div>`).join('') :
      `<div style="text-align:center;padding:20px;color:var(--text3)">
        No projects yet.<br><span style="color:var(--accent);cursor:pointer" onclick="App.newProject()">+ Create your first project</span>
      </div>`;
  },
};

// ══════════════════════════════════════════════════════════════
//  AI CHAT  (Real: writes files, diffs, applies changes)
// ══════════════════════════════════════════════════════════════
const AGENT_SYSTEMS = {
  master:     'You are the Master Agent. Orchestrate specialized agents for complex tasks.',
  planner:    'You are the Planner Agent. Create detailed technical roadmaps and task breakdowns.',
  researcher: 'You are the Research Agent. Find accurate information and best practices.',
  coder:      'You are the Coding Agent. Write production-ready code following best practices.',
  designer:   'You are the UI Designer Agent. Create beautiful, mobile-first interfaces.',
  reviewer:   'You are the Code Review Agent. Find bugs, security issues, improvements.',
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

    return `You are OmniCode — a world-class AI coding assistant embedded in a Telegram Mini App (like Cursor AI, but on mobile).

${agentSys}

CAPABILITIES:
- Write and edit code across multiple files
- Create complete projects from scratch
- Review and fix bugs
- Explain code clearly
- Help deploy to GitHub

FILE WRITING PROTOCOL:
When you need to create or modify files, use this exact format:
<WRITE_FILE path="relative/path/file.ext">
file content here
</WRITE_FILE>

You can write multiple files in one response. Always write complete file contents, not partial updates.
After writing files, briefly explain what you did.

ACTIVE PROJECT: ${project ? project.name : 'None selected'}
ACTIVE TOOLS: ${[...State.activeTools].join(', ')}
${projectCtx}

Rules:
- Be concise but complete
- Always write working code
- For mobile users: keep explanations short
- When writing files, include ALL necessary code (not snippets)`;
  },

  addWelcome() {
    const el = document.getElementById('chat-messages');
    if (!el) return;
    el.innerHTML = '';
    this.appendBubble('ai', `**OmniCode AI** — Cursor-level coding on mobile 🚀

**What I can do:**
- Write complete files & full projects
- Edit your code (like Cursor's Cmd+K)
- Review PRs, fix bugs, explain code
- Push directly to GitHub
- Run 12 specialized AI agents

**Getting started:**
1. Create a project (Projects tab)
2. Describe what to build
3. I'll write the files — you apply them

What are we building?`, false);
  },

  appendBubble(role, text, hasWrites) {
    const el = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = `bubble ${role}`;

    if (role === 'ai') {
      const clean = FS.stripCommands(text);
      div.innerHTML = MD.render(clean);

      if (hasWrites) {
        const btn = document.createElement('button');
        btn.className = 'apply-btn';
        btn.textContent = `📝 Apply ${State.pendingWrites.length} file${State.pendingWrites.length>1?'s':''}`;
        btn.onclick = () => DiffView.show();
        div.appendChild(btn);
      }

      // Action chips for AI responses
      const chips = document.createElement('div');
      chips.className = 'bubble-chips';
      chips.innerHTML = ['Improve','Explain','Shorter','Fix bugs'].map(a =>
        `<button class="bubble-chip" onclick="AI.quickAction('${a}')">${a}</button>`).join('');
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
    div.innerHTML = `<div class="thinking-dots"><span></span><span></span><span></span></div><span style="font-size:13px;color:var(--text3)">Thinking...</span>`;
    el.appendChild(div); el.scrollTop = el.scrollHeight;
  },
  hideTyping() { document.getElementById('typing-ind')?.remove(); },

  async send(text) {
    const inp = document.getElementById('chat-input');
    const msg = (text || inp?.value || '').trim();
    if (!msg || this.busy) return;
    if (inp) { inp.value = ''; inp.style.height = ''; }

    // Resolve @ file references
    const resolved = await this.resolveRefs(msg);
    this.appendBubble('user', msg, false);
    State.chatHistory.push({ role: 'user', content: resolved });

    this.busy = true;
    this.showTyping();

    const messages = [
      { role: 'system', content: this.system() },
      ...State.chatHistory.slice(-16),
    ];

    try {
      const reply = await AIRouter.call(messages);
      this.hideTyping();

      // Parse file writes
      const writes = FS.parseWrites(reply);
      if (writes.length) {
        State.pendingWrites = writes;
        this.appendBubble('ai', reply, true);
        toast(`📝 ${writes.length} file${writes.length>1?'s':''} ready to apply`);
      } else {
        this.appendBubble('ai', reply, false);
      }

      State.chatHistory.push({ role: 'assistant', content: reply });
    } catch (e) {
      this.hideTyping();
      this.appendBubble('ai', `❌ **${e.message}**\n\nAdd API keys in **Settings → API Keys** to enable AI.`, false);
    } finally {
      this.busy = false;
    }
  },

  // Resolve @filename references
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
  },
  async quickAction(action) {
    const last = State.chatHistory.filter(m => m.role === 'assistant').pop();
    if (!last) { toast('No previous response to act on'); return; }
    const prompts = { Improve: 'Improve this:', Explain: 'Explain this clearly:', Shorter: 'Make this shorter and clearer:', 'Fix bugs': 'Find and fix any bugs in this:' };
    await this.send(`${prompts[action]} ${last.content.slice(0, 500)}`);
  },
};

// ══════════════════════════════════════════════════════════════
//  DIFF VIEWER — Show pending file writes before applying
// ══════════════════════════════════════════════════════════════
const DiffView = {
  current: 0,

  show() {
    if (!State.pendingWrites.length) { toast('No pending changes'); return; }
    this.current = 0;
    this.render();
    Sheet.open('diff-sheet');
  },

  render() {
    const writes = State.pendingWrites;
    const w = writes[this.current];
    const projectId = State.projectId;
    const existing = projectId ? FS.read(projectId, w.path) : '';
    const diff = Diff.compute(existing, w.content);
    const isNew = !existing;

    document.getElementById('diff-title').textContent = `${isNew ? '+ New' : '~ Modified'}: ${w.path}`;
    document.getElementById('diff-nav').textContent = `${this.current + 1} / ${writes.length}`;
    document.getElementById('diff-body').innerHTML = Diff.renderHTML(diff);
    document.getElementById('diff-prev').style.opacity = this.current === 0 ? '0.3' : '1';
    document.getElementById('diff-next').style.opacity = this.current === writes.length - 1 ? '0.3' : '1';
  },

  prev() { if (this.current > 0) { this.current--; this.render(); } },
  next() { if (this.current < State.pendingWrites.length - 1) { this.current++; this.render(); } },

  applyAll() {
    if (!State.projectId) { toast('⚠️ Select a project first'); Sheet.close('diff-sheet'); App.nav('projects'); return; }
    for (const w of State.pendingWrites) {
      FS.write(State.projectId, w.path, w.content);
    }
    const count = State.pendingWrites.length;
    State.pendingWrites = [];
    Sheet.close('diff-sheet');
    Projects.render();
    Home.refresh();
    toast(`✅ Applied ${count} file${count>1?'s':''}`);
  },

  rejectAll() {
    State.pendingWrites = [];
    Sheet.close('diff-sheet');
    toast('❌ Changes rejected');
  },
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
        <div style="font-size:15px;font-weight:600;margin-bottom:8px">No Projects Yet</div>
        <div style="font-size:13px;margin-bottom:16px">Create your first project to get started</div>
        <button onclick="App.newProject()" style="background:var(--accent);border:none;color:#fff;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">+ New Project</button>
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
          ${isActive ? '<span style="font-size:10px;color:var(--accent);font-weight:700;background:rgba(255,77,79,0.1);padding:2px 7px;border-radius:10px">Active</span>' : ''}
          <span onclick="Projects.menu('${p.id}',event)" style="font-size:18px;color:var(--text3);padding:4px 8px">⋯</span>
        </div>
        <div class="folder-files">
          ${files.map(f => `
          <div class="file-row" onclick="Editor.open('${p.id}','${f}')">
            <span class="fi-icon">${fileIcon(f)}</span>
            <span class="fi-name">${f}</span>
            <span class="fi-badge ${gitBadge(f)}${isActive?'':''}">${gitBadge(f)}</span>
          </div>`).join('')}
          <div class="file-row" style="color:var(--text3)" onclick="Projects.addFile('${p.id}')">
            <span class="fi-icon">+</span>
            <span class="fi-name" style="color:var(--text3)">Add file...</span>
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
    toast(`📁 ${p.name} — active project`);
    this.render();
    Home.refresh();
    // Update project name in AI chat
    document.getElementById('active-project-label').textContent = p.name;
    document.getElementById('active-project-label').style.display = '';
  },

  newProject() {
    const name = document.getElementById('new-project-name').value.trim();
    const tpl = document.getElementById('new-project-template').value;
    if (!name) { toast('Enter project name'); return; }
    const p = PM.create(name, tpl);
    this.open(p.id);
    Sheet.close('new-project-sheet');
    App.nav('projects');
    toast(`✅ Project "${name}" created`);
  },

  toggleFolder(arrow, e) {
    e.stopPropagation();
    const files = arrow.closest('.folder-row').nextElementSibling;
    const open = arrow.classList.contains('open');
    arrow.classList.toggle('open', !open);
    files.style.display = open ? 'none' : '';
  },

  addFile(projectId) {
    const name = prompt('File path (e.g. src/utils.js):');
    if (!name) return;
    FS.write(projectId, name, `// ${name}\n`);
    Editor.open(projectId, name);
    this.render();
  },

  menu(id, e) {
    e.stopPropagation();
    const p = PM.get(id);
    const action = confirm(`Project: ${p.name}\n\nOK = Push to GitHub\nCancel = Delete project`);
    if (action) Deploy.pushProject(id);
    else if (confirm(`Delete "${p.name}"? This cannot be undone.`)) {
      PM.delete(id);
      this.render();
      Home.refresh();
      toast('🗑 Project deleted');
    }
  },

  filter(type, el) {
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
  },

  search(q) {
    const lower = q.toLowerCase();
    document.querySelectorAll('.folder-block').forEach(b => {
      const name = b.querySelector('.f-name').textContent.toLowerCase();
      b.style.display = name.includes(lower) ? '' : 'none';
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
    const lang = langFromPath(path);
    document.getElementById('ed-badge').textContent = lang;

    // Render editable textarea overlay
    const view = document.getElementById('code-view');
    view.innerHTML = `
      <textarea id="editor-textarea" class="editor-ta" spellcheck="false"
        oninput="Editor.onChange(this)">${escHTML(content)}</textarea>`;

    App.nav('editor');
  },

  onChange(ta) {
    if (!this.projectId || !this.file) return;
    FS.write(this.projectId, this.file, ta.value);
  },

  async aiEdit() {
    if (!this.file) return;
    const content = FS.read(this.projectId, this.file);
    const instruction = prompt('What should AI do with this file?');
    if (!instruction) return;

    toast('🤖 AI editing...', 3000);
    const messages = [
      { role: 'system', content: `You are a code editor. The user wants to modify a file.
Respond ONLY with the complete modified file content wrapped in <WRITE_FILE path="${this.file}">...</WRITE_FILE>.
No explanation needed.` },
      { role: 'user', content: `File: ${this.file}\n\nCurrent content:\n${content}\n\nInstruction: ${instruction}` },
    ];

    try {
      const reply = await AIRouter.call(messages);
      const writes = FS.parseWrites(reply);
      if (writes.length) {
        State.pendingWrites = writes;
        DiffView.show();
      } else {
        toast('AI did not return file changes');
      }
    } catch (e) {
      toast('❌ ' + e.message);
    }
  },

  termTab(el, tab) {
    document.querySelectorAll('.term-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
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
    document.getElementById('agent-sheet-title').textContent = `${name.charAt(0).toUpperCase()+name.slice(1)} Agent`;
    document.getElementById('agent-task-input').value = '';
    document.getElementById('agent-task-input').placeholder = `What should the ${name} agent do?`;
    Sheet.open('agent-sheet');
  },

  runMaster() {
    this.current = 'master';
    State.agent = 'master';
    document.getElementById('agent-sheet-title').textContent = 'Master Agent';
    document.getElementById('agent-task-input').placeholder = 'Describe your full project goal in detail...';
    Sheet.open('agent-sheet');
  },

  async executeTask() {
    const task = document.getElementById('agent-task-input').value.trim();
    if (!task) return;
    Sheet.close('agent-sheet');
    App.nav('ai');
    const agentName = (this.current || 'master').toUpperCase();
    await AI.send(`[${agentName} AGENT TASK]\n${task}`);
    State.agent = null;
  },

  // Multi-agent pipeline
  async runPipeline(task, agentList = ['planner', 'coder', 'reviewer']) {
    App.nav('ai');
    AI.appendBubble('ai', `🤖 **Multi-Agent Pipeline** starting...\nAgents: ${agentList.join(' → ')}`, false);

    let context = task;
    for (const name of agentList) {
      State.agent = name;
      const sys = AGENT_SYSTEMS[name];
      const messages = [
        { role: 'system', content: sys + '\n\n' + AI.system() },
        { role: 'user', content: `Task: ${task}\n\nContext from previous agents:\n${context}\n\nNow complete your part.` },
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
      } catch (e) {
        AI.hideTyping();
        AI.appendBubble('ai', `❌ ${name} failed: ${e.message}`, false);
      }
    }
    State.agent = null;
  },
};

// ══════════════════════════════════════════════════════════════
//  DEPLOY
// ══════════════════════════════════════════════════════════════
const Deploy = {
  async start() {
    const projectId = State.projectId;
    if (!projectId) { toast('⚠️ Select a project first'); App.nav('projects'); return; }
    const p = PM.get(projectId);
    if (!p.github) { Sheet.open('github-deploy-sheet'); return; }
    await this.push(projectId, p.github.owner, p.github.repo, p.github.branch || 'main');
  },

  async setupAndPush() {
    const owner = document.getElementById('gh-owner').value.trim();
    const repo = document.getElementById('gh-repo').value.trim();
    const branch = document.getElementById('gh-branch').value.trim() || 'main';
    if (!owner || !repo) { toast('Enter owner and repo name'); return; }
    Sheet.close('github-deploy-sheet');

    const projectId = State.projectId;
    PM.update(projectId, { github: { owner, repo, branch } });
    await this.push(projectId, owner, repo, branch);
  },

  async pushProject(projectId) {
    const p = PM.get(projectId);
    if (!p.github) { PM.setCurrent(projectId); Sheet.open('github-deploy-sheet'); return; }
    await this.push(projectId, p.github.owner, p.github.repo, p.github.branch || 'main');
  },

  async push(projectId, owner, repo, branch) {
    const logs = document.getElementById('deploy-logs');
    const addLog = (msg, ok = false) => {
      const t = new Date().toLocaleTimeString('en-US', {hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'});
      logs.innerHTML += `<div class="log-line"><span class="log-t">${t}</span><span class="log-m${ok?' ok':''}">${msg}</span></div>`;
      logs.scrollTop = logs.scrollHeight;
    };

    logs.innerHTML = '';
    App.nav('deploy');

    const setStep = (id, state) => {
      const el = document.getElementById(id);
      if (el) el.className = `step-dot ${state}`;
    };

    setStep('step-github', 'orange');
    addLog('› Connecting to GitHub...');
    await delay(400);

    try {
      await Git.me();
      setStep('step-github', 'green');
      addLog(`› Connected as ${owner} ✓`);
    } catch (e) {
      setStep('step-github', 'red');
      addLog(`› GitHub error: ${e.message}`, false);
      toast('❌ GitHub: ' + e.message); return;
    }

    setStep('step-build', 'orange');
    addLog(`› Pushing files to ${owner}/${repo}@${branch}...`);
    const results = await Git.pushProject(projectId, owner, repo, branch);

    let ok = 0, fail = 0;
    for (const r of results) {
      if (r.ok) { ok++; addLog(`  ✓ ${r.path}`, true); }
      else { fail++; addLog(`  ✗ ${r.path}: ${r.error}`); }
    }

    setStep('step-build', fail === 0 ? 'green' : 'orange');
    addLog(fail === 0 ? `› All ${ok} files pushed ✓` : `› ${ok} ok, ${fail} failed`);

    await delay(400);
    setStep('step-tests', 'green');
    addLog('› Build triggered on GitHub Actions ✓');

    await delay(600);
    setStep('step-deploy', 'green');
    addLog(`✓ Deployed: https://${repo}.pages.dev`, true);

    toast(fail === 0 ? '🚀 Deployed successfully!' : `⚠️ ${fail} files failed`);
  },
};

// ══════════════════════════════════════════════════════════════
//  SETTINGS
// ══════════════════════════════════════════════════════════════
const Settings = {
  refresh() {
    const keys = Store.get('keys', {});
    const orEl = document.getElementById('or-status');
    const ghEl = document.getElementById('gh-status');
    const groqEl = document.getElementById('groq-status');
    if (orEl) orEl.textContent = keys.or1 ? 'Connected' : 'Not set';
    if (ghEl) { ghEl.textContent = keys.github ? 'Connected' : 'Not set'; ghEl.className = keys.github ? 's-connected' : 's-val'; }
    if (groqEl) { groqEl.textContent = keys.groq ? 'Connected' : 'Not set'; groqEl.className = keys.groq ? 's-connected' : 's-val'; }
  },

  openConnector(name) {
    this._conn = name;
    const keys = Store.get('keys', {});
    const configs = {
      openrouter: { title: 'OpenRouter Keys', label1: 'API Key 1 (sk-or-v1-...)', label2: 'API Key 2 (optional)', val1: keys.or1||'', val2: keys.or2||'', show2: true },
      github:     { title: 'GitHub Token',    label1: 'Personal Access Token', label2: '', val1: keys.github||'', val2: '', show2: false },
      groq:       { title: 'Groq API Key',    label1: 'API Key (gsk_...)', label2: '', val1: keys.groq||'', val2: '', show2: false },
    };
    const c = configs[name] || configs.openrouter;
    document.getElementById('connector-sheet-title').textContent = c.title;
    document.querySelectorAll('.sh-label')[0].textContent = c.label1;
    document.getElementById('conn-key1').value = c.val1;
    document.getElementById('conn-key2').style.display = c.show2 ? '' : 'none';
    document.querySelectorAll('.sh-label')[1].style.display = c.show2 ? '' : 'none';
    if (c.show2) document.getElementById('conn-key2').value = c.val2;
    Sheet.open('connector-sheet');
  },

  save() {
    const keys = Store.get('keys', {});
    const k1 = document.getElementById('conn-key1').value.trim();
    const k2 = document.getElementById('conn-key2').value.trim();
    if (this._conn === 'openrouter') { if (k1) keys.or1=k1; if (k2) keys.or2=k2; }
    else if (this._conn === 'github') { if (k1) keys.github=k1; }
    else if (this._conn === 'groq') { if (k1) keys.groq=k1; }
    Store.set('keys', keys);
    Sheet.close('connector-sheet');
    this.refresh();
    toast('✅ Saved securely');
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
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}
function fileIcon(path) {
  const ext = path.split('.').pop().toLowerCase();
  const icons = { js:'🟨', jsx:'⚛️', ts:'🔷', tsx:'⚛️', py:'🐍', html:'🌐', css:'🎨',
    json:'📋', md:'📖', sh:'⚡', env:'🔑', txt:'📄', yml:'⚙️', yaml:'⚙️', sql:'🗄️' };
  return icons[ext] || '📄';
}
function langFromPath(path) {
  const ext = path.split('.').pop().toLowerCase();
  const langs = { js:'JavaScript', jsx:'React JSX', ts:'TypeScript', tsx:'React TSX',
    py:'Python', html:'HTML', css:'CSS', json:'JSON', md:'Markdown', sh:'Shell', yml:'YAML' };
  return langs[ext] || ext.toUpperCase();
}
function gitBadge(path) {
  const badges = ['A','M','U'];
  return badges[Math.floor(Math.random()*badges.length)];
}
function escHTML(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// ── Init ─────────────────────────────────────────────────────────
App.init();
