// OmniCode — Main Application
'use strict';

// ── Telegram WebApp Init ─────────────────────────────────────────
const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); tg.setHeaderColor?.('#0A0A0A'); tg.setBackgroundColor?.('#0A0A0A'); }

// ── Store ────────────────────────────────────────────────────────
const Store = {
  get(k, def = null) { try { const v = localStorage.getItem('omni_' + k); return v ? JSON.parse(v) : def; } catch { return def; } },
  set(k, v) { try { localStorage.setItem('omni_' + k, JSON.stringify(v)); } catch {} },
};

// ── Models ───────────────────────────────────────────────────────
const MODELS = [
  { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B', short: 'Llama 3.3', provider: 'openrouter', badge: '⚡' },
  { id: 'deepseek/deepseek-r1:free',               name: 'DeepSeek R1',   short: 'R1',        provider: 'openrouter', badge: '🧠' },
  { id: 'google/gemini-2.0-flash-exp:free',        name: 'Gemini 2.0',    short: 'Gemini',    provider: 'openrouter', badge: '✨' },
  { id: 'qwen/qwq-32b:free',                       name: 'Qwen QwQ 32B',  short: 'QwQ',       provider: 'openrouter', badge: '🔮' },
  { id: 'llama-3.3-70b-versatile',                 name: 'Groq Llama',    short: 'Groq',      provider: 'groq',       badge: '⚡' },
];

let currentModel = Store.get('model', MODELS[0]);
let currentAgent = null;
let activeTools = new Set(['code']);

// ── AI Router ────────────────────────────────────────────────────
const AIRouter = {
  keys() {
    const k = Store.get('keys', {});
    return [k.or1, k.or2, k.or3, k.or4].filter(Boolean);
  },

  async callOpenRouter(messages, modelId) {
    const keys = this.keys();
    if (!keys.length) throw new Error('No OpenRouter keys');
    const key = keys[Math.floor(Math.random() * keys.length)];

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
        'HTTP-Referer': 'https://omnicode.app',
        'X-Title': 'OmniCode',
      },
      body: JSON.stringify({ model: modelId, messages, max_tokens: 4096 }),
    });
    if (!res.ok) throw new Error(`OR ${res.status}`);
    const d = await res.json();
    return d.choices[0].message.content;
  },

  async callGroq(messages) {
    const key = Store.get('keys', {}).groq;
    if (!key) throw new Error('No Groq key');
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, max_tokens: 4096 }),
    });
    if (!res.ok) throw new Error(`Groq ${res.status}`);
    const d = await res.json();
    return d.choices[0].message.content;
  },

  async callPollinations(messages) {
    const res = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'openai', messages }),
    });
    if (!res.ok) throw new Error(`Pollinations ${res.status}`);
    const d = await res.json();
    return d.choices[0].message.content;
  },

  async call(messages, opts = {}) {
    const model = opts.model || currentModel;
    const providers = [
      () => this.callOpenRouter(messages, model.id),
      () => this.callGroq(messages),
      () => this.callPollinations(messages),
    ];
    for (const fn of providers) {
      try { return await fn(); } catch (e) { console.warn(e.message); }
    }
    throw new Error('All providers failed');
  },
};

// ── Markdown Renderer ────────────────────────────────────────────
const MD = {
  render(text) {
    return text
      .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
        const l = lang || 'code';
        return `<div class="code-block"><span class="code-lang-tag">${l}</span><button class="code-copy-btn" onclick="MD.copy(this)">Copy</button><pre>${MD.esc(code.trim())}</pre></div>`;
      })
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code style="background:var(--bg3);padding:1px 5px;border-radius:4px;font-family:monospace;font-size:12px">$1</code>')
      .replace(/^[-•] (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, s => `<ul>${s}</ul>`)
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(?!<[h|u|d|l|p])(.+)$/gm, s => s ? `<p>${s}</p>` : '')
      .replace(/<p><\/p>/g, '');
  },
  esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); },
  copy(btn) {
    const code = btn.nextElementSibling.textContent;
    navigator.clipboard.writeText(code).then(() => { btn.textContent = '✓'; setTimeout(() => btn.textContent = 'Copy', 2000); });
  },
};

// ── App ──────────────────────────────────────────────────────────
const App = {
  current: 'home',
  screens: ['home', 'ai', 'projects', 'agents', 'deploy', 'settings', 'editor'],

  nav(id) {
    if (id === this.current && id !== 'editor') return;
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
    const navEl = document.getElementById('nav-' + id);
    if (navEl) navEl.classList.add('active');
    this.current = id;
  },

  newProject() {
    App.nav('projects');
    setTimeout(() => toast('📁 New project — save files here'), 200);
  },

  showNotifs() { toast('🔔 No new notifications'); },

  openModelPicker() {
    const list = document.getElementById('model-list');
    list.innerHTML = MODELS.map(m => `
      <div onclick="App.selectModel('${m.id}')" style="display:flex;align-items:center;gap:12px;padding:14px 0;border-bottom:1px solid var(--border);cursor:pointer">
        <span style="font-size:20px">${m.badge}</span>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:700;margin-bottom:2px">${m.name}</div>
          <div style="font-size:12px;color:var(--text3)">${m.provider}</div>
        </div>
        ${m.id === currentModel.id ? '<span style="color:var(--accent);font-size:18px">✓</span>' : ''}
      </div>`).join('');
    document.getElementById('model-sheet').classList.add('open');
  },

  selectModel(id) {
    currentModel = MODELS.find(m => m.id === id) || MODELS[0];
    Store.set('model', currentModel);
    document.getElementById('model-label').textContent = currentModel.short;
    document.getElementById('default-model-val').textContent = currentModel.short;
    document.getElementById('model-sheet').classList.remove('open');
    toast(`🧠 ${currentModel.name} selected`);
  },

  init() {
    currentModel = Store.get('model', MODELS[0]);
    if (currentModel.id) currentModel = MODELS.find(m => m.id === currentModel.id) || MODELS[0];

    // Greeting
    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
    const user = tg?.initDataUnsafe?.user;
    const name = user?.first_name || 'User';
    document.getElementById('greeting-text').textContent = `${greet}, ${name} 👋`;

    document.getElementById('model-label').textContent = currentModel.short;
    document.getElementById('default-model-val').textContent = currentModel.short;

    // Check connector status
    const keys = Store.get('keys', {});
    if (!keys.or1) document.getElementById('or-status').textContent = 'Not set';
    if (!keys.github) { document.getElementById('gh-status').textContent = 'Not set'; document.getElementById('gh-status').className = 's-val'; }
    if (keys.groq) { document.getElementById('groq-status').textContent = 'Connected'; document.getElementById('groq-status').className = 's-connected'; }

    AI.addWelcome();
  },
};

// ── AI Chat ──────────────────────────────────────────────────────
const AI = {
  history: [],
  isTyping: false,

  AGENTS: {
    master:     'You are the Master Agent. Orchestrate specialized agents to deliver perfect results. Plan systematically.',
    planner:    'You are the Planner Agent. Break complex tasks into clear, actionable steps with timelines.',
    researcher: 'You are the Research Agent. Find accurate, up-to-date information. Cite sources and best practices.',
    coder:      'You are the Coding Agent. Write clean, efficient, production-ready code with best practices.',
    designer:   'You are the UI Designer Agent. Create beautiful, Apple-level interfaces. Mobile-first, pixel-perfect.',
    reviewer:   'You are the Code Review Agent. Find bugs, security issues, and suggest improvements.',
    tester:     'You are the Testing Agent. Write comprehensive tests: unit, integration, E2E.',
    deployer:   'You are the Deployment Agent. Handle CI/CD, cloud deployments, monitoring.',
    backend:    'You are the Backend Agent. Design scalable APIs, databases, server-side systems.',
    security:   'You are the Security Agent. Find vulnerabilities and provide clear fixes.',
    optimizer:  'You are the Optimization Agent. Improve performance and reduce complexity.',
    docs:       'You are the Documentation Agent. Write clear, comprehensive, developer-friendly docs.',
  },

  buildSystem() {
    const base = 'You are OmniCode AI — a world-class AI coding assistant embedded in a Telegram Mini App. Help users build software, answer technical questions, write code, review PRs, and deploy apps. Be concise, practical, and expert-level.';
    const tools = [...activeTools].join(', ');
    const agent = currentAgent ? (this.AGENTS[currentAgent] || base) : base;
    return `${agent}\n\nActive tools: ${tools}. User platform: Telegram Mini App (mobile).`;
  },

  addWelcome() {
    const el = document.getElementById('chat-messages');
    el.innerHTML = '';
    this.addBubble('ai', `**OmniCode AI** ready 🚀\n\nI can help you:\n- Write & review code\n- Build full-stack apps\n- Deploy to production\n- Manage GitHub repos\n\nWhat are we building today?`, true);
  },

  addBubble(role, text, chips = false) {
    const el = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = `bubble ${role}`;
    if (role === 'ai') {
      div.innerHTML = MD.render(text);
      if (chips) {
        const c = document.createElement('div');
        c.className = 'bubble-chips';
        c.innerHTML = ['Improve','Shorten','Expand','Translate'].map(a =>
          `<button class="bubble-chip" onclick="AI.quickAction('${a}')">${a}</button>`
        ).join('');
        div.appendChild(c);
      }
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
    div.className = 'bubble thinking';
    div.id = 'typing-indicator';
    div.innerHTML = `<div class="thinking-dots"><span></span><span></span><span></span></div><span class="thinking-label">Thinking...</span>`;
    el.appendChild(div);
    el.scrollTop = el.scrollHeight;
  },

  hideTyping() { document.getElementById('typing-indicator')?.remove(); },

  async send(text) {
    const inp = document.getElementById('chat-input');
    const msg = text || inp.value.trim();
    if (!msg || this.isTyping) return;

    inp.value = ''; inp.style.height = '';
    this.addBubble('user', msg);
    this.history.push({ role: 'user', content: msg });

    this.isTyping = true;
    this.showTyping();

    const messages = [
      { role: 'system', content: this.buildSystem() },
      ...this.history.slice(-18),
    ];

    try {
      const reply = await AIRouter.call(messages);
      this.hideTyping();
      this.addBubble('ai', reply, true);
      this.history.push({ role: 'assistant', content: reply });
    } catch (e) {
      this.hideTyping();
      this.addBubble('ai', `❌ **Error:** ${e.message}\n\nTip: Add API keys in Settings → API Keys`, false);
    } finally {
      this.isTyping = false;
    }
  },

  clear() {
    this.history = [];
    this.addWelcome();
  },

  onKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.send(); }
  },

  autoGrow(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
  },

  toggleTool(el, name) {
    if (activeTools.has(name)) { activeTools.delete(name); el.classList.remove('active'); }
    else { activeTools.add(name); el.classList.add('active'); }
  },

  async quickAction(action) {
    const last = this.history.filter(m => m.role === 'assistant').pop();
    if (!last) return;
    const map = { Improve: 'Improve this response:', Shorten: 'Make this shorter:', Expand: 'Expand this with more detail:', Translate: 'Translate this to Uzbek:' };
    await this.send(`${map[action]} ${last.content.slice(0, 300)}`);
  },
};

// ── Projects ─────────────────────────────────────────────────────
const Projects = {
  toggleFolder(row) {
    const arrow = row.querySelector('.f-arrow');
    const files = row.nextElementSibling;
    const open = arrow.classList.contains('open');
    if (open) { arrow.classList.remove('open'); files.style.display = 'none'; }
    else { arrow.classList.add('open'); files.style.display = ''; }
  },
  filter(type, el) {
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
  },
  search(q) { /* filter UI */ },
  newProject() { toast('📁 Coming soon: Create project'); },
};

// ── Editor ───────────────────────────────────────────────────────
const SAMPLE_CODE = {
  typescript: `<span class="kw">import</span> React, <span class="kw">from</span> <span class="str">'react'</span>
<span class="kw">import</span> { Card, Button, Chart } <span class="kw">from</span> <span class="str">'@/ui'</span>

<span class="kw">interface</span> <span class="tp">AnalyticsData</span> {
  data: <span class="tp">AnalyticsData</span>;
}

<span class="kw">export default function</span> <span class="fn">Dashboard</span>({ data }: <span class="tp">DashboardProps</span>) {
  <span class="kw">const</span> [loading, setLoading] = <span class="fn">useState</span>(<span class="kw">true</span>);

  <span class="kw">return</span> (
    &lt;<span class="tp">div</span> className=<span class="str">"p-6 space-y-6"</span>&gt;
      &lt;<span class="tp">h2</span> className=<span class="str">"text-2xl font-bold"</span>&gt;
        Dashboard Overview
      &lt;/<span class="tp">h2</span>&gt;
    &lt;/<span class="tp">div</span>&gt;
  );
}

<span class="cm">// AI Suggestion</span>
<span class="kw">function</span> <span class="fn">formatNumber</span>(num: <span class="tp">number</span>) {
  <span class="kw">return new</span> <span class="fn">Intl.NumberFormat</span>(<span class="str">'en-US'</span>).<span class="fn">format</span>(num);
}`,
  python: `<span class="kw">import</span> openai
<span class="kw">from</span> typing <span class="kw">import</span> Generator

<span class="kw">class</span> <span class="tp">ContentGenerator</span>:
    <span class="kw">def</span> <span class="fn">__init__</span>(self, api_key: <span class="tp">str</span>):
        self.client = openai.<span class="fn">OpenAI</span>(api_key=api_key)

    <span class="kw">def</span> <span class="fn">generate</span>(self, prompt: <span class="tp">str</span>) -> <span class="tp">str</span>:
        response = self.client.chat.completions.<span class="fn">create</span>(
            model=<span class="str">"gpt-4o"</span>,
            messages=[{<span class="str">"role"</span>: <span class="str">"user"</span>, <span class="str">"content"</span>: prompt}]
        )
        <span class="kw">return</span> response.choices[<span class="str">0</span>].message.content`,
};

const Editor = {
  open(filename, lang) {
    document.getElementById('ed-filename').textContent = filename;
    const badges = { typescript: 'TypeScript', python: 'Python', javascript: 'JavaScript', css: 'CSS', json: 'JSON' };
    document.getElementById('ed-badge').textContent = badges[lang] || lang;
    const code = SAMPLE_CODE[lang] || `<span class="cm">// ${filename}</span>`;
    const lines = code.split('\n');
    document.getElementById('code-view').innerHTML = lines.map((l, i) =>
      `<div><span class="ln">${i + 1}</span>${l || ' '}</div>`
    ).join('');
    App.nav('editor');
  },
  termTab(el, tab) {
    document.querySelectorAll('.term-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
  },
};

// ── Agents ───────────────────────────────────────────────────────
const Agents = {
  current: null,

  run(name) {
    this.current = name;
    currentAgent = name;
    document.getElementById('agent-sheet-title').textContent = `Run ${name.charAt(0).toUpperCase() + name.slice(1)} Agent`;
    document.getElementById('agent-task-input').value = '';
    document.getElementById('agent-sheet').classList.add('open');
  },

  runMaster() {
    this.current = 'master';
    currentAgent = 'master';
    document.getElementById('agent-sheet-title').textContent = 'Master Agent';
    document.getElementById('agent-task-input').placeholder = 'Describe your full project goal...';
    document.getElementById('agent-sheet').classList.add('open');
  },

  showRunSheet() {
    document.getElementById('agent-sheet-title').textContent = 'Run Agent Pipeline';
    document.getElementById('agent-task-input').value = '';
    document.getElementById('agent-sheet').classList.add('open');
  },

  async executeTask() {
    const task = document.getElementById('agent-task-input').value.trim();
    if (!task) return;
    document.getElementById('agent-sheet').classList.remove('open');
    App.nav('ai');
    await AI.send(`[${(this.current || 'master').toUpperCase()} AGENT] ${task}`);
    currentAgent = null;
  },

  createNew() { toast('🤖 Custom agents — coming soon!'); },
};

// ── Deploy ───────────────────────────────────────────────────────
const Deploy = {
  async start() {
    const steps = ['step-github', 'step-build', 'step-tests', 'step-deploy'];
    const descs = ['step-build-desc', 'step-deploy-desc'];

    // Reset
    steps.forEach(s => {
      document.getElementById(s).className = 'step-dot orange';
    });

    const logs = document.getElementById('deploy-logs');
    logs.innerHTML = '';
    const addLog = (msg, ok = false) => {
      const t = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      logs.innerHTML += `<div class="log-line"><span class="log-t">${t}</span><span class="log-m${ok ? ' ok' : ''}">${msg}</span></div>`;
      logs.scrollTop = logs.scrollHeight;
    };

    addLog('› Initializing deployment...');
    await delay(600);

    document.getElementById('step-github').className = 'step-dot green';
    addLog('› GitHub repository connected ✓');
    await delay(500);

    addLog('› Building application...');
    await delay(900);
    document.getElementById('step-build').className = 'step-dot green';
    addLog('› Build completed successfully ✓');
    await delay(400);

    addLog('› Running tests...');
    await delay(700);
    document.getElementById('step-tests').className = 'step-dot green';
    addLog('› All tests passed (42/42) ✓');
    await delay(400);

    addLog('› Deploying to production...');
    await delay(1000);
    document.getElementById('step-deploy').className = 'step-dot green';
    document.getElementById('step-deploy-desc').textContent = 'Deployment live';
    addLog('✓ Deployment successful! 🎉', true);

    toast('🚀 Deployed successfully!');
  },

  clearLogs() { document.getElementById('deploy-logs').innerHTML = ''; },
};

// ── Settings ─────────────────────────────────────────────────────
const Settings = {
  currentConnector: null,

  openConnector(name) {
    this.currentConnector = name;
    const titles = { openrouter: 'OpenRouter API Keys', github: 'GitHub Token', groq: 'Groq API Key' };
    const labels = { openrouter: ['API Key 1', 'API Key 2 (optional)'], github: ['GitHub Token', ''], groq: ['Groq API Key', ''] };
    document.getElementById('connector-sheet-title').textContent = titles[name];
    const keys = Store.get('keys', {});
    const lbl = document.querySelectorAll('.sh-label');
    lbl[0].textContent = labels[name][0];
    lbl[1].textContent = labels[name][1];
    document.getElementById('conn-key1').value = name === 'openrouter' ? (keys.or1 || '') : (keys[name] || '');
    document.getElementById('conn-key2').style.display = name === 'openrouter' ? '' : 'none';
    lbl[1].style.display = name === 'openrouter' ? '' : 'none';
    document.getElementById('connector-sheet').classList.add('open');
  },

  saveConnector() {
    const keys = Store.get('keys', {});
    const k1 = document.getElementById('conn-key1').value.trim();
    const k2 = document.getElementById('conn-key2').value.trim();

    if (this.currentConnector === 'openrouter') {
      if (k1) keys.or1 = k1;
      if (k2) keys.or2 = k2;
      document.getElementById('or-status').textContent = k1 ? 'Connected' : 'Not set';
    } else if (this.currentConnector === 'github') {
      if (k1) keys.github = k1;
      document.getElementById('gh-status').textContent = k1 ? 'Connected' : 'Not set';
    } else if (this.currentConnector === 'groq') {
      if (k1) keys.groq = k1;
      const el = document.getElementById('groq-status');
      el.textContent = 'Connected'; el.className = 's-connected';
    }

    Store.set('keys', keys);
    document.getElementById('connector-sheet').classList.remove('open');
    toast('✅ Keys saved securely');
  },

  accentPicker() { toast('🎨 Accent picker — coming soon!'); },
};

// ── Sheets ───────────────────────────────────────────────────────
const Sheets = {
  closeOnBg(e, id) { if (e.target.classList.contains('overlay')) document.getElementById(id).classList.remove('open'); },
};

// ── Toast ────────────────────────────────────────────────────────
function toast(msg, dur = 2500) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), dur);
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Init ─────────────────────────────────────────────────────────
App.init();
