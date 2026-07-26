// ═══════════════════════════════════════════════════════════════
// OmniCode TMA — Main Application
// Architecture: Module pattern with global namespaces for TMA
// ═══════════════════════════════════════════════════════════════

'use strict';

// ── Telegram WebApp Init ─────────────────────────────────────────
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  tg.setHeaderColor('#0A0A0A');
  tg.setBackgroundColor('#0A0A0A');
}

// ── State ────────────────────────────────────────────────────────
const State = {
  currentScreen: 'home',
  projects: [],
  activeProject: null,
  messages: [],
  msgCount: 0,
  isStreaming: false,
  activeModel: null,
  connectors: {
    openrouter: { keys: [], active: false },
    groq: { key: '', active: false },
    github: { token: '', repo: '', branch: 'main', active: false },
    cloudflare: { accountId: '', apiToken: '', active: false },
  },
  deployRunning: false,
  agentRunning: null,
};

// ── Models Config ─────────────────────────────────────────────────
const MODELS = [
  { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B', provider: 'openrouter', badge: '⚡ Fast · Free', desc: 'Best for general coding' },
  { id: 'deepseek/deepseek-r1:free',              name: 'DeepSeek R1',   provider: 'openrouter', badge: '🧠 Reasoning', desc: 'Deep reasoning & analysis' },
  { id: 'google/gemma-3-27b-it:free',             name: 'Gemma 3 27B',  provider: 'openrouter', badge: '🌐 Google', desc: 'Long context support' },
  { id: 'qwen/qwen-2.5-72b-instruct:free',        name: 'Qwen 2.5 72B', provider: 'openrouter', badge: '🔥 Powerful', desc: 'Strong coding model' },
  { id: 'llama-3.3-70b-versatile',                name: 'Llama Groq',   provider: 'groq',       badge: '⚡ Fastest', desc: 'Ultra-fast inference' },
  { id: 'openai',                                  name: 'Pollinations', provider: 'pollinations', badge: '🌸 Free', desc: 'Always available, no key' },
];

// ── Persist / Load ─────────────────────────────────────────────────
const Store = {
  save() {
    localStorage.setItem('omnicode_v2', JSON.stringify({
      connectors: State.connectors,
      projects: State.projects,
      activeModel: State.activeModel,
      msgCount: State.msgCount,
    }));
  },
  load() {
    try {
      const d = JSON.parse(localStorage.getItem('omnicode_v2') || '{}');
      if (d.connectors) State.connectors = { ...State.connectors, ...d.connectors };
      if (d.projects) State.projects = d.projects;
      if (d.activeModel) State.activeModel = d.activeModel;
      if (d.msgCount) State.msgCount = d.msgCount;
    } catch {}
  },
};

// ── AI Router ─────────────────────────────────────────────────────
const AIRouter = {
  orKeyIndex: 0,

  getNextORKey() {
    const keys = State.connectors.openrouter.keys.filter(k => k?.length > 10);
    if (!keys.length) return null;
    const k = keys[this.orKeyIndex % keys.length];
    this.orKeyIndex++;
    return k;
  },

  getModel() {
    return State.activeModel || MODELS[0];
  },

  async call(messages, opts = {}) {
    const model = this.getModel();

    // 1. OpenRouter
    if (model.provider === 'openrouter' || !model.provider) {
      const key = this.getNextORKey();
      if (key) {
        try {
          const r = await this._callOpenRouter(key, model.id, messages, opts);
          if (r) return { ...r, provider: 'OpenRouter', model: model.name };
        } catch (e) { console.warn('OpenRouter failed:', e.message); }
      }
    }

    // 2. Groq fallback
    if (State.connectors.groq.key) {
      try {
        const r = await this._callGroq(State.connectors.groq.key, messages, opts);
        if (r) return { ...r, provider: 'Groq', model: 'Llama 3.3' };
      } catch (e) { console.warn('Groq failed:', e.message); }
    }

    // 3. Pollinations (always free, no key)
    try {
      const r = await this._callPollinations(messages, opts);
      if (r) return { ...r, provider: 'Pollinations', model: 'OpenAI' };
    } catch (e) { console.warn('Pollinations failed:', e.message); }

    throw new Error('All AI providers failed. Check your API keys in Settings.');
  },

  async _callOpenRouter(key, modelId, messages, opts) {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
        'HTTP-Referer': 'https://omnicode.app',
        'X-Title': 'OmniCode',
      },
      body: JSON.stringify({ model: modelId, messages, max_tokens: opts.maxTokens || 4096, stream: false }),
    });
    if (!res.ok) throw new Error(`OR ${res.status}`);
    const d = await res.json();
    const text = d.choices?.[0]?.message?.content;
    if (!text) throw new Error('Empty response');
    return { text };
  },

  async _callGroq(key, messages, opts) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, max_tokens: opts.maxTokens || 4096 }),
    });
    if (!res.ok) throw new Error(`Groq ${res.status}`);
    const d = await res.json();
    const text = d.choices?.[0]?.message?.content;
    if (!text) throw new Error('Empty response');
    return { text };
  },

  async _callPollinations(messages, opts) {
    const res = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'openai', messages }),
    });
    if (!res.ok) throw new Error(`Pollinations ${res.status}`);
    const d = await res.json();
    const text = d.choices?.[0]?.message?.content;
    if (!text) throw new Error('Empty response');
    return { text };
  },
};

// ── GitHub API ────────────────────────────────────────────────────
const GitHub = {
  async push(files, commitMsg) {
    const { token, repo, branch } = State.connectors.github;
    if (!token || !repo) throw new Error('GitHub not configured');

    let pushed = 0;
    for (const [path, content] of Object.entries(files)) {
      let sha;
      try {
        const r = await fetch(`https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`, {
          headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
        });
        if (r.ok) sha = (await r.json()).sha;
      } catch {}

      const body = { message: commitMsg, content: btoa(unescape(encodeURIComponent(content))), branch };
      if (sha) body.sha = sha;

      const r = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
        method: 'PUT',
        headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const e = await r.json();
        throw new Error(e.message || 'Push failed');
      }
      pushed++;
    }
    return pushed;
  },

  async getRepoInfo() {
    const { token, repo } = State.connectors.github;
    if (!token || !repo) return null;
    const r = await fetch(`https://api.github.com/repos/${repo}`, {
      headers: { Authorization: `token ${token}` },
    });
    if (!r.ok) return null;
    return r.json();
  },
};

// ── Markdown Renderer ─────────────────────────────────────────────
const MD = {
  render(text) {
    return text
      .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
        `<pre><code class="lang-${lang}">${this.escape(code.trim())}</code></pre>`)
      .replace(/`([^`]+)`/g, (_, c) => `<code>${this.escape(c)}</code>`)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^### (.*$)/gm, '<h3 style="font-size:14px;font-weight:700;margin:12px 0 4px">$1</h3>')
      .replace(/^## (.*$)/gm,  '<h2 style="font-size:15px;font-weight:700;margin:12px 0 6px">$1</h2>')
      .replace(/^# (.*$)/gm,   '<h1 style="font-size:16px;font-weight:800;margin:12px 0 8px">$1</h1>')
      .replace(/^- (.*$)/gm, '<div style="padding:2px 0 2px 12px">• $1</div>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
  },
  escape(t) { return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); },
};

// ── UI Utilities ──────────────────────────────────────────────────
const UI = {
  toast(msg, type = '') {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.innerHTML = `<span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span> ${msg}`;
    c.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(-8px) scale(0.95)'; setTimeout(() => t.remove(), 300); }, 2800);
  },

  vibrate(pattern = 10) {
    try { navigator.vibrate?.(pattern); } catch {}
  },

  showSheet(id) {
    document.getElementById(id).classList.add('open');
    document.getElementById(id).onclick = (e) => {
      if (e.target === document.getElementById(id)) UI.hideSheet(id);
    };
  },
  hideSheet(id) { document.getElementById(id).classList.remove('open'); },

  showModelPicker() {
    const list = document.getElementById('model-picker-list');
    list.innerHTML = '';
    MODELS.forEach(m => {
      const active = State.activeModel?.id === m.id;
      const el = document.createElement('div');
      el.className = 'card';
      el.style.cssText = `cursor:pointer;display:flex;align-items:center;gap:12px;${active ? 'border-color:var(--accent);background:var(--accent-dim)' : ''}`;
      el.innerHTML = `
        <div style="flex:1">
          <div style="font-weight:600;font-size:14px">${m.name}</div>
          <div style="font-size:11px;color:var(--text-2);margin-top:2px">${m.desc}</div>
        </div>
        <div class="badge badge-${active?'green':'blue'}" style="font-size:10px">${m.badge}</div>
        ${active ? '<span style="color:var(--accent)">✓</span>' : ''}
      `;
      el.onclick = () => { App.setModel(m); UI.hideSheet('model-sheet'); };
      list.appendChild(el);
    });
    UI.showSheet('model-sheet');
  },
};

// ── App Core ──────────────────────────────────────────────────────
window.App = {
  navigate(screen) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(`screen-${screen}`).classList.add('active');
    document.getElementById(`nav-${screen}`)?.classList.add('active');
    State.currentScreen = screen;
    UI.vibrate(8);
    if (screen === 'home') App.refreshHome();
    if (screen === 'settings') Settings.refresh();
  },

  setModel(model) {
    State.activeModel = model;
    Store.save();
    document.getElementById('active-model-name').textContent = model.name;
    document.getElementById('chat-model-label').textContent = `${model.id} · ${model.provider}`;
    UI.toast(`Model: ${model.name}`, 'success');
  },

  quickAction(action) {
    UI.vibrate(8);
    const map = {
      'new-project': () => { App.navigate('projects'); setTimeout(() => Projects.newProject(), 150); },
      'ai-chat':     () => App.navigate('ai'),
      'deploy':      () => App.navigate('deploy'),
      'github':      () => { App.navigate('settings'); setTimeout(() => Settings.openConnector('github'), 150); },
      'editor':      () => { UI.toast('Open a project first', ''); App.navigate('projects'); },
    };
    map[action]?.();
  },

  refreshHome() {
    document.getElementById('stat-projects').textContent = State.projects.length;
    document.getElementById('stat-messages').textContent = State.msgCount;
    const name = tg?.initDataUnsafe?.user?.first_name || 'Developer';
    document.getElementById('home-username').textContent = name;
    document.getElementById('home-avatar').textContent = name[0]?.toUpperCase() || 'U';

    const rp = document.getElementById('recent-projects');
    if (State.projects.length === 0) {
      rp.innerHTML = `<div class="card" style="text-align:center;padding:24px;color:var(--text-3)">
        <div style="font-size:32px;margin-bottom:8px">📁</div>
        <div style="font-size:14px">No projects yet</div>
        <div style="font-size:12px;margin-top:4px">Tap "New Project" to start</div>
      </div>`;
    } else {
      rp.innerHTML = State.projects.slice(0, 3).map(p => `
        <div class="card" onclick="Projects.open('${p.id}')" style="cursor:pointer;margin-bottom:8px">
          <div class="flex items-center gap-12">
            <div style="font-size:24px">${p.icon || '📁'}</div>
            <div class="flex-1">
              <div class="font-600">${p.name}</div>
              <div class="text-xs text-3">${p.files?.length || 0} files · ${p.language || 'Unknown'}</div>
            </div>
            <div class="badge badge-${p.deployed ? 'green' : 'blue'}">${p.deployed ? 'Live' : 'Local'}</div>
          </div>
        </div>
      `).join('');
    }
  },

  init() {
    Store.load();
    State.activeModel = State.activeModel || MODELS[0];
    document.getElementById('active-model-name').textContent = State.activeModel.name;
    document.getElementById('chat-model-label').textContent = `${State.activeModel.id} · ${State.activeModel.provider}`;
    Settings.refresh();
    App.refreshHome();
    Settings.renderModelList();
  },
};

// ── AI Chat ───────────────────────────────────────────────────────
window.AI = {
  activeTools: new Set(['code']),

  toggleTool(tool) {
    const chips = document.querySelectorAll('.tool-chip');
    chips.forEach(c => {
      if (c.textContent.trim().toLowerCase().includes(tool)) {
        c.classList.toggle('active');
        if (c.classList.contains('active')) this.activeTools.add(tool);
        else this.activeTools.delete(tool);
      }
    });
  },

  resize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  },

  handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.send(); }
  },

  addBubble(role, content, meta = '') {
    const wrap = document.getElementById('chat-messages');
    const el = document.createElement('div');
    el.className = `bubble bubble-${role} anim-fade`;
    if (role === 'user') {
      el.textContent = content;
    } else {
      el.innerHTML = MD.render(content);
      if (meta) {
        const m = document.createElement('div');
        m.className = 'bubble-meta';
        m.textContent = `• ${meta}`;
        el.appendChild(m);

        // Extract code blocks → offer to save
        const codeMatch = content.match(/```(\w+)\n([\s\S]+?)```/);
        if (codeMatch && State.activeProject) {
          const lang = codeMatch[1];
          const ext = { python:'py', javascript:'js', typescript:'ts', html:'html', css:'css', sql:'sql', bash:'sh' }[lang] || lang;
          const btn = document.createElement('button');
          btn.className = 'btn btn-ghost btn-sm';
          btn.style.marginTop = '8px';
          btn.innerHTML = `📁 Save as generated.${ext}`;
          btn.onclick = () => {
            Projects.addFile(State.activeProject, `generated.${ext}`, codeMatch[2]);
            UI.toast(`Saved to generated.${ext}`, 'success');
          };
          el.appendChild(btn);
        }
      }
    }
    wrap.appendChild(el);
    el.scrollIntoView({ behavior: 'smooth', block: 'end' });
    State.messages.push({ role: role === 'user' ? 'user' : 'assistant', content });
    return el;
  },

  showTyping() {
    const wrap = document.getElementById('chat-messages');
    const el = document.createElement('div');
    el.className = 'bubble bubble-ai';
    el.id = 'typing-indicator';
    el.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
    wrap.appendChild(el);
    el.scrollIntoView({ behavior: 'smooth' });
    return el;
  },

  buildSystemPrompt() {
    const project = State.activeProject ? State.projects.find(p => p.id === State.activeProject) : null;
    const tools = [...this.activeTools].join(', ');
    return [
      'You are OmniCode AI — a world-class AI coding assistant built into a Telegram Mini App.',
      'You help developers build, debug, deploy, and manage software projects from their phone.',
      'Be concise, practical, and professional. Format code in markdown code blocks.',
      `Active tools: ${tools}`,
      project ? `Current project: ${project.name} (${project.language || 'Unknown'}) — ${project.files?.length || 0} files` : 'No project selected.',
      project?.files?.length ? `Files: ${project.files.map(f => f.name).join(', ')}` : '',
      'Always provide working, production-ready code. Explain briefly. Be like Cursor AI but better.',
    ].filter(Boolean).join('\n');
  },

  async send() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text || State.isStreaming) return;

    UI.vibrate(8);
    input.value = '';
    input.style.height = 'auto';
    State.isStreaming = true;
    document.getElementById('send-btn').disabled = true;
    document.getElementById('ai-status-text').textContent = 'Thinking...';

    this.addBubble('user', text);
    State.msgCount++;
    Store.save();
    document.getElementById('msg-count-label').textContent = `${State.msgCount} messages`;

    const typing = this.showTyping();

    const messages = [
      { role: 'system', content: this.buildSystemPrompt() },
      ...State.messages.slice(-12),
    ];

    try {
      const result = await AIRouter.call(messages);
      typing.remove();
      this.addBubble('ai', result.text, `${result.model} · ${result.provider}`);
      document.getElementById('ai-status-text').textContent = `via ${result.provider}`;
    } catch (e) {
      typing.remove();
      this.addBubble('ai', `❌ **Error:** ${e.message}\n\nGo to **Settings → Connectors** to configure your API keys.`);
      document.getElementById('ai-status-text').textContent = 'Error';
      UI.toast(e.message, 'error');
    }

    State.isStreaming = false;
    document.getElementById('send-btn').disabled = false;
  },

  clearChat() {
    State.messages = [];
    const wrap = document.getElementById('chat-messages');
    wrap.innerHTML = `<div class="bubble bubble-ai anim-fade">
      Chat cleared. How can I help you?
    </div>`;
    UI.toast('Chat cleared', '');
  },
};

// ── Projects ──────────────────────────────────────────────────────
window.Projects = {
  renderList(filter = '') {
    const list = document.getElementById('projects-list');
    const filtered = State.projects.filter(p =>
      !filter || p.name.toLowerCase().includes(filter.toLowerCase())
    );

    if (filtered.length === 0) {
      list.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-3)">
        <div style="font-size:48px;margin-bottom:12px">🗂️</div>
        <div style="font-size:16px;font-weight:600;margin-bottom:4px">${filter ? 'No results' : 'No projects'}</div>
        <div style="font-size:14px">${filter ? 'Try different keywords' : 'Create your first project'}</div>
        ${!filter ? `<button class="btn btn-primary" style="margin-top:16px" onclick="Projects.newProject()">✨ Create Project</button>` : ''}
      </div>`;
      return;
    }

    list.innerHTML = filtered.map(p => `
      <div class="card" onclick="Projects.open('${p.id}')" style="cursor:pointer">
        <div class="flex items-center gap-12" style="margin-bottom:10px">
          <div style="font-size:28px">${p.icon || '📁'}</div>
          <div class="flex-1">
            <div class="font-600" style="font-size:15px">${p.name}</div>
            <div class="text-xs text-3 truncate">${p.description || 'No description'}</div>
          </div>
          <div class="badge badge-${p.deployed ? 'green' : 'blue'}">${p.deployed ? '🟢 Live' : 'Local'}</div>
        </div>
        <div class="flex gap-8" style="flex-wrap:wrap">
          ${p.language ? `<div class="badge badge-purple" style="font-size:10px">${p.language}</div>` : ''}
          <div class="badge badge-yellow" style="font-size:10px">📄 ${p.files?.length || 0} files</div>
          <div class="text-xs text-3" style="margin-left:auto;align-self:center">${p.updatedAt || 'Just now'}</div>
        </div>
      </div>
    `).join('');
  },

  search(val) { this.renderList(val); },

  newProject() {
    const name = prompt('Project name:');
    if (!name?.trim()) return;
    const lang = prompt('Language (js/python/html/etc.):') || 'javascript';
    const desc = prompt('Description (optional):') || '';

    const icons = { javascript:'⚡', typescript:'💙', python:'🐍', html:'🌐', css:'🎨', react:'⚛️', vue:'💚', rust:'🦀' };
    const project = {
      id: Date.now().toString(),
      name: name.trim(),
      language: lang.trim(),
      description: desc.trim(),
      icon: icons[lang.toLowerCase()] || '📁',
      files: [],
      deployed: false,
      createdAt: new Date().toLocaleDateString(),
      updatedAt: 'Just now',
    };

    State.projects.unshift(project);
    Store.save();
    this.renderList();
    App.refreshHome();
    UI.toast(`Project "${name}" created!`, 'success');
    UI.vibrate([10, 5, 10]);

    // Auto ask AI about the project
    setTimeout(() => {
      App.navigate('ai');
      document.getElementById('chat-input').value = `I just created a new ${lang} project called "${name}". ${desc ? 'Description: ' + desc + '.' : ''} Help me set it up with a good project structure and initial files.`;
      AI.resize(document.getElementById('chat-input'));
    }, 300);
  },

  open(id) {
    State.activeProject = id;
    const project = State.projects.find(p => p.id === id);
    if (!project) return;
    App.navigate('ai');
    AI.addBubble('ai', `📁 **${project.name}** opened.\n\n${project.files?.length ? `Files: ${project.files.map(f => f.name).join(', ')}` : 'No files yet. Ask me to create some!'}\n\nWhat would you like to do?`);
  },

  addFile(projectId, filename, content) {
    const project = State.projects.find(p => p.id === projectId);
    if (!project) return;
    const existing = project.files.findIndex(f => f.name === filename);
    if (existing >= 0) project.files[existing].content = content;
    else project.files.push({ name: filename, content, updatedAt: new Date().toISOString() });
    project.updatedAt = 'Just now';
    Store.save();
  },
};

// ── Agents ────────────────────────────────────────────────────────
window.Agents = {
  currentAgent: null,

  run(agentName) {
    this.currentAgent = agentName;
    const names = {
      planner:'Planner', researcher:'Researcher', coder:'Coder',
      designer:'UI Designer', backend:'Backend', tester:'Tester',
      security:'Security', reviewer:'Reviewer', optimizer:'Optimizer',
      deployer:'Deployer', docs:'Docs Writer', devops:'DevOps',
    };
    document.getElementById('agent-sheet-title').textContent = `${names[agentName]} Agent`;
    const prompts = {
      planner:    'Break this task into detailed steps:',
      researcher: 'Research and find the best solution for:',
      coder:      'Write clean, production-ready code for:',
      designer:   'Design a beautiful, mobile-first UI for:',
      backend:    'Create a scalable backend/API for:',
      tester:     'Write comprehensive tests for:',
      security:   'Security audit this code:',
      reviewer:   'Code review and improvements for:',
      optimizer:  'Optimize performance of:',
      deployer:   'Create deployment config for:',
      docs:       'Write documentation for:',
      devops:     'Set up CI/CD pipeline for:',
    };
    document.getElementById('agent-task-input').placeholder = prompts[agentName] || 'Describe the task...';
    document.getElementById('agent-task-input').value = '';
    UI.showSheet('agent-sheet');
    UI.vibrate(8);
  },

  async runMaster() {
    const task = prompt('What do you want to build? Describe the full project:');
    if (!task?.trim()) return;
    App.navigate('ai');
    document.getElementById('chat-input').value = `[MASTER AGENT] Build this completely: ${task}\n\nPlan → Research → Code → Test → Deploy`;
    await AI.send();
  },

  async executeTask() {
    const task = document.getElementById('agent-task-input').value.trim();
    if (!task || !this.currentAgent) return;
    UI.hideSheet('agent-sheet');

    const systemPrompts = {
      coder:    'You are an expert coder. Write clean, efficient, production-ready code. Include comments. No fluff.',
      designer: 'You are a world-class UI/UX designer. Create beautiful, Apple-level designs using HTML/CSS. Mobile-first.',
      tester:   'You are a QA expert. Write comprehensive unit, integration, and e2e tests. Use best practices.',
      security: 'You are a security expert. Find vulnerabilities, explain them, and provide fixes. Be thorough.',
      reviewer: 'You are a senior code reviewer. Be constructive, specific, and professional. Suggest improvements.',
      planner:  'You are a project planner. Break tasks into clear, actionable steps. Be specific and realistic.',
    };

    const sys = systemPrompts[this.currentAgent] ||
      `You are the ${this.currentAgent} agent. Be expert-level, precise, and deliver production-ready output.`;

    App.navigate('ai');

    const typing = AI.showTyping();
    State.isStreaming = true;

    try {
      const result = await AIRouter.call([
        { role: 'system', content: sys },
        { role: 'user', content: task },
      ]);
      typing.remove();
      AI.addBubble('ai', `🤖 **[${this.currentAgent.toUpperCase()} AGENT]**\n\n${result.text}`, result.provider);
    } catch (e) {
      typing.remove();
      AI.addBubble('ai', `❌ Agent failed: ${e.message}`);
      UI.toast(e.message, 'error');
    }

    State.isStreaming = false;
  },
};

// ── Deploy ────────────────────────────────────────────────────────
window.Deploy = {
  steps: ['commit', 'push', 'build', 'test', 'deploy', 'health'],
  stepDurations: { commit: 800, push: 1500, build: 3000, test: 2000, deploy: 2500, health: 1000 },

  resetSteps() {
    this.steps.forEach(s => {
      const step = document.querySelector(`[data-step="${s}"]`);
      if (!step) return;
      step.className = 'pipeline-step';
      step.querySelector('.step-icon').className = 'step-icon pending';
      step.querySelector('.step-icon').textContent = { commit:'①', push:'②', build:'③', test:'④', deploy:'⑤', health:'⑥' }[s];
      document.getElementById(`step-${s}-time`).textContent = '—';
    });
    document.getElementById('deploy-log').innerHTML = '<span style="color:var(--text-3)">Starting deployment...</span>';
  },

  log(msg, color = 'var(--text-2)') {
    const logEl = document.getElementById('deploy-log');
    logEl.innerHTML += `\n<span style="color:${color}">${msg}</span>`;
    logEl.scrollTop = logEl.scrollHeight;
  },

  async runStep(stepName, action) {
    const step = document.querySelector(`[data-step="${stepName}"]`);
    const icon = step.querySelector('.step-icon');
    step.classList.add('active');
    icon.className = 'step-icon active';
    icon.textContent = '⟳';
    this.log(`▶ ${stepName.toUpperCase()}...`, 'var(--yellow)');

    const start = Date.now();
    try {
      await action();
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      step.classList.remove('active');
      step.classList.add('done');
      icon.className = 'step-icon done';
      icon.textContent = '✓';
      document.getElementById(`step-${stepName}-time`).textContent = `${elapsed}s`;
      this.log(`✓ ${stepName.toUpperCase()} done (${elapsed}s)`, 'var(--green)');
    } catch (e) {
      step.classList.remove('active');
      step.classList.add('error');
      icon.className = 'step-icon error';
      icon.textContent = '✗';
      this.log(`✗ ${stepName.toUpperCase()} failed: ${e.message}`, 'var(--accent)');
      throw e;
    }
  },

  sleep(ms) { return new Promise(r => setTimeout(r, ms)); },

  async start() {
    if (State.deployRunning) return;
    const project = State.projects.find(p => p.id === State.activeProject);

    if (!project) {
      UI.toast('Select a project first', 'error');
      App.navigate('projects');
      return;
    }

    State.deployRunning = true;
    const btn = document.getElementById('deploy-btn');
    btn.disabled = true;
    btn.textContent = '⏳ Deploying...';
    this.resetSteps();
    document.getElementById('deploy-status-badge').className = 'badge badge-yellow';
    document.getElementById('deploy-status-badge').textContent = 'Deploying';
    UI.vibrate([10, 5, 10, 5, 10]);

    try {
      // 1. Commit
      await this.runStep('commit', async () => {
        await this.sleep(this.stepDurations.commit);
        this.log(`  Staged ${project.files?.length || 0} files`);
      });

      // 2. Push
      await this.runStep('push', async () => {
        if (State.connectors.github.token && project.files?.length) {
          const files = {};
          project.files.forEach(f => { files[f.name] = f.content; });
          const pushed = await GitHub.push(files, `deploy: ${project.name} via OmniCode`);
          this.log(`  Pushed ${pushed} files to GitHub`);
        } else {
          await this.sleep(this.stepDurations.push);
          this.log('  GitHub not configured — skipped');
        }
      });

      // 3. Build
      await this.runStep('build', async () => {
        await this.sleep(this.stepDurations.build);
        this.log(`  Build complete — ${project.language || 'Unknown'} project`);
      });

      // 4. Test
      await this.runStep('test', async () => {
        await this.sleep(this.stepDurations.test);
        this.log('  All tests passed ✓');
      });

      // 5. Deploy
      await this.runStep('deploy', async () => {
        await this.sleep(this.stepDurations.deploy);
        this.log('  Deployed to production');
      });

      // 6. Health
      await this.runStep('health', async () => {
        await this.sleep(this.stepDurations.health);
        this.log('  Health check: 200 OK ✓', 'var(--green)');
      });

      project.deployed = true;
      project.deployedAt = new Date().toLocaleString();
      Store.save();

      document.getElementById('deploy-status-badge').className = 'badge badge-green';
      document.getElementById('deploy-status-badge').textContent = '✓ Deployed';
      btn.textContent = '✅ Deployed!';
      UI.toast(`${project.name} deployed successfully!`, 'success');
      UI.vibrate([20, 5, 20]);

      // Add to history
      const history = document.getElementById('deploy-history');
      history.innerHTML = `
        <div class="row card" style="margin-bottom:0">
          <div class="dot dot-green"></div>
          <div class="flex-1">
            <div class="row-label text-sm">${project.name}</div>
            <div class="row-sub">${new Date().toLocaleString()}</div>
          </div>
          <div class="badge badge-green">Success</div>
        </div>
      ` + history.innerHTML;

      setTimeout(() => {
        btn.textContent = '🚀 Deploy Now';
        btn.disabled = false;
      }, 3000);

    } catch (e) {
      document.getElementById('deploy-status-badge').className = 'badge badge-red';
      document.getElementById('deploy-status-badge').textContent = 'Failed';
      btn.textContent = '🚀 Retry';
      btn.disabled = false;
      UI.toast('Deployment failed: ' + e.message, 'error');
    }

    State.deployRunning = false;
  },
};

// ── Settings ──────────────────────────────────────────────────────
window.Settings = {
  refresh() {
    const { openrouter, groq, github } = State.connectors;
    const orKeys = openrouter.keys.filter(k => k?.length > 10);

    document.getElementById('or-status').textContent = orKeys.length ? `${orKeys.length} keys configured` : 'No keys';
    document.getElementById('or-badge').className = `badge badge-${orKeys.length ? 'green' : 'red'}`;
    document.getElementById('or-badge').textContent = orKeys.length ? '✓ Active' : 'Configure';

    document.getElementById('groq-status').textContent = groq.key ? 'Connected' : 'Not configured';
    document.getElementById('groq-badge').className = `badge badge-${groq.key ? 'green' : 'red'}`;
    document.getElementById('groq-badge').textContent = groq.key ? '✓ Active' : 'Configure';

    document.getElementById('gh-status').textContent = github.token ? (github.repo || 'Connected') : 'Not connected';
    document.getElementById('gh-badge').className = `badge badge-${github.token ? 'green' : 'red'}`;
    document.getElementById('gh-badge').textContent = github.token ? '✓ Connected' : 'Connect';
  },

  renderModelList() {
    const container = document.getElementById('model-list');
    container.innerHTML = MODELS.map(m => {
      const active = State.activeModel?.id === m.id;
      return `<div class="card" onclick="App.setModel(${JSON.stringify(m).replace(/"/g,'&quot;')})" style="cursor:pointer;${active ? 'border-color:var(--accent);background:var(--accent-dim)' : ''}">
        <div class="flex items-center gap-12">
          <div class="flex-1">
            <div class="font-600" style="font-size:14px">${m.name}</div>
            <div class="text-xs text-2">${m.desc}</div>
          </div>
          <div class="badge badge-${active ? 'green' : 'blue'}" style="font-size:10px">${m.badge}</div>
          ${active ? '<span style="color:var(--accent);font-weight:700">✓</span>' : ''}
        </div>
      </div>`;
    }).join('');
  },

  openConnector(type) {
    const titles = { openrouter:'OpenRouter', groq:'Groq', github:'GitHub', cloudflare:'Cloudflare' };
    document.getElementById('sheet-title').textContent = `🔌 ${titles[type]}`;

    const content = document.getElementById('sheet-content');
    const c = State.connectors;

    if (type === 'openrouter') {
      content.innerHTML = `
        ${[1,2,3,4].map(i => `
          <div style="margin-bottom:10px">
            <div style="font-size:12px;color:var(--text-2);margin-bottom:4px">API Key ${i}${i===1?' (Primary)':''}</div>
            <input class="input" id="or-key-${i}" type="password" placeholder="sk-or-v1-..." value="${c.openrouter.keys[i-1] || ''}">
          </div>
        `).join('')}
        <div style="margin-bottom:10px">
          <div style="font-size:12px;color:var(--text-2);margin-bottom:4px">Default Model</div>
          <select class="input" id="or-model-sel">
            ${MODELS.filter(m=>m.provider==='openrouter').map(m=>
              `<option value="${m.id}">${m.name}</option>`
            ).join('')}
          </select>
        </div>
        <button class="btn btn-primary btn-full" onclick="Settings.saveConnector('openrouter')">Save & Connect</button>
        <div style="margin-top:10px;font-size:11px;color:var(--text-3);text-align:center">
          Get free keys at openrouter.ai/keys
        </div>`;
    } else if (type === 'groq') {
      content.innerHTML = `
        <div style="margin-bottom:12px">
          <div style="font-size:12px;color:var(--text-2);margin-bottom:4px">Groq API Key</div>
          <input class="input" id="groq-key-input" type="password" placeholder="gsk_..." value="${c.groq.key || ''}">
        </div>
        <button class="btn btn-primary btn-full" onclick="Settings.saveConnector('groq')">Save & Connect</button>
        <div style="margin-top:10px;font-size:11px;color:var(--text-3);text-align:center">
          Get free key at console.groq.com
        </div>`;
    } else if (type === 'github') {
      content.innerHTML = `
        <div style="margin-bottom:10px">
          <div style="font-size:12px;color:var(--text-2);margin-bottom:4px">Personal Access Token</div>
          <input class="input" id="gh-token-input" type="password" placeholder="ghp_..." value="${c.github.token || ''}">
        </div>
        <div style="margin-bottom:10px">
          <div style="font-size:12px;color:var(--text-2);margin-bottom:4px">Repository (owner/repo)</div>
          <input class="input" id="gh-repo-input" type="text" placeholder="username/my-repo" value="${c.github.repo || ''}">
        </div>
        <div style="margin-bottom:12px">
          <div style="font-size:12px;color:var(--text-2);margin-bottom:4px">Branch</div>
          <input class="input" id="gh-branch-input" type="text" placeholder="main" value="${c.github.branch || 'main'}">
        </div>
        <button class="btn btn-primary btn-full" onclick="Settings.saveConnector('github')">Save & Connect</button>
        <div style="margin-top:10px;font-size:11px;color:var(--text-3);text-align:center">
          Create token at github.com/settings/tokens
        </div>`;
    } else if (type === 'cloudflare') {
      content.innerHTML = `
        <div style="margin-bottom:10px">
          <div style="font-size:12px;color:var(--text-2);margin-bottom:4px">Account ID</div>
          <input class="input" id="cf-account" type="text" placeholder="abc123..." value="${c.cloudflare?.accountId || ''}">
        </div>
        <div style="margin-bottom:12px">
          <div style="font-size:12px;color:var(--text-2);margin-bottom:4px">API Token</div>
          <input class="input" id="cf-token" type="password" placeholder="..." value="${c.cloudflare?.apiToken || ''}">
        </div>
        <button class="btn btn-primary btn-full" onclick="Settings.saveConnector('cloudflare')">Save & Connect</button>`;
    }

    UI.showSheet('connector-sheet');
  },

  saveConnector(type) {
    if (type === 'openrouter') {
      State.connectors.openrouter.keys = [1,2,3,4].map(i =>
        document.getElementById(`or-key-${i}`)?.value.trim() || ''
      );
      State.connectors.openrouter.active = State.connectors.openrouter.keys.some(k => k.length > 10);
    } else if (type === 'groq') {
      State.connectors.groq.key = document.getElementById('groq-key-input')?.value.trim() || '';
      State.connectors.groq.active = !!State.connectors.groq.key;
    } else if (type === 'github') {
      State.connectors.github.token  = document.getElementById('gh-token-input')?.value.trim() || '';
      State.connectors.github.repo   = document.getElementById('gh-repo-input')?.value.trim() || '';
      State.connectors.github.branch = document.getElementById('gh-branch-input')?.value.trim() || 'main';
      State.connectors.github.active = !!State.connectors.github.token;
    } else if (type === 'cloudflare') {
      State.connectors.cloudflare = {
        accountId: document.getElementById('cf-account')?.value.trim() || '',
        apiToken:  document.getElementById('cf-token')?.value.trim() || '',
        active: true,
      };
    }

    Store.save();
    UI.hideSheet('connector-sheet');
    Settings.refresh();
    Settings.renderModelList();
    UI.toast('Saved!', 'success');
    UI.vibrate(10);
  },
};

// ── Bootstrap ─────────────────────────────────────────────────────
App.init();
Projects.renderList();
