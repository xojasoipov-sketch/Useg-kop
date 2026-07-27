/**
 * OmniCode Frontend — app.js v3.2
 * Store, AIRouter, Git, Multi-file DiffView, AI → Brain, SelfImprove, RAG
 */

import { createBrain } from './brain/index.js';

export const Store = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem('oc_' + key);
      if (raw === null || raw === undefined) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    localStorage.setItem('oc_' + key, JSON.stringify(value));
  },
  keys() {
    return this.get('keys', {});
  },
  saveKeys(patch) {
    const k = { ...this.keys(), ...patch };
    this.set('keys', k);
    return k;
  },
};

function toast(msg, ms = 2800) {
  const el = document.getElementById('toast');
  if (!el) {
    console.log('[toast]', msg);
    return;
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), ms);
}

function $(id) {
  return document.getElementById(id);
}

export const Analytics = {
  track() {
    const d = Store.get('analytics', { requests: 0, tokens: 0 });
    d.requests = (d.requests || 0) + 1;
    Store.set('analytics', d);
    const el = $('stat-requests');
    if (el) el.textContent = String(d.requests);
  },
};

export const Tasks = {
  list: [],
  clear() {
    this.list = [];
  },
};

export const AIRouter = {
  async chat(messages, opts = {}) {
    const keys = Store.keys();
    const model = Store.get('model', 'meta-llama/llama-3.3-70b-instruct:free');
    const body = {
      model: opts.model || model,
      messages,
      temperature: opts.temperature ?? 0.4,
      max_tokens: opts.max_tokens ?? 4096,
    };
    const providers = [];
    for (const k of [keys.or1, keys.or2, keys.or3, keys.or4]) {
      if (k && String(k).length > 10) {
        providers.push({
          name: 'OpenRouter',
          url: 'https://openrouter.ai/api/v1/chat/completions',
          key: k,
          headers: { 'HTTP-Referer': location.origin, 'X-Title': 'OmniCode' },
        });
      }
    }
    if (keys.groq) {
      providers.push({
        name: 'Groq',
        url: 'https://api.groq.com/openai/v1/chat/completions',
        key: keys.groq,
        model: 'llama-3.3-70b-versatile',
      });
    }
    providers.push({
      name: 'Pollinations',
      url: 'https://text.pollinations.ai/openai',
      key: 'dummy',
      model: 'openai',
    });
    const errors = [];
    for (const p of providers) {
      try {
        const payload = { ...body, model: p.model || body.model };
        const res = await fetch(p.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + p.key,
            ...(p.headers || {}),
          },
          body: JSON.stringify(payload),
        });
        if (res.status === 429 || res.status === 503) {
          errors.push(p.name + ': limit');
          continue;
        }
        if (!res.ok) {
          errors.push(p.name + ': HTTP ' + res.status);
          continue;
        }
        const data = await res.json();
        data._provider = p.name;
        Analytics.track();
        return data;
      } catch (e) {
        errors.push(p.name + ': ' + e.message);
      }
    }
    throw new Error('Barcha provayderlar ishlamadi:\n' + errors.join('\n'));
  },
};

export const Git = {
  _token() {
    return Store.keys().github || '';
  },
  _headers() {
    const t = this._token();
    if (!t) throw new Error("GitHub token yo'q — Sozlamalar → Kod");
    return {
      Accept: 'application/vnd.github+json',
      Authorization: 'Bearer ' + t,
      'X-GitHub-Api-Version': '2022-11-28',
    };
  },
  async listRepos() {
    const res = await fetch('https://api.github.com/user/repos?per_page=50&sort=updated', {
      headers: this._headers(),
    });
    if (!res.ok) throw new Error('repos: ' + res.status);
    return res.json();
  },
  async listFiles(owner, repo, path = '') {
    const p = path ? '/' + path.replace(/^\/+/, '') : '';
    const res = await fetch(
      'https://api.github.com/repos/' + owner + '/' + repo + '/contents' + p,
      { headers: this._headers() }
    );
    if (!res.ok) throw new Error('listFiles: ' + res.status);
    return res.json();
  },
  async getFileContent(owner, repo, path) {
    const res = await fetch(
      'https://api.github.com/repos/' +
        owner +
        '/' +
        repo +
        '/contents/' +
        path.replace(/^\/+/, ''),
      { headers: this._headers() }
    );
    if (!res.ok) throw new Error('getFile: ' + res.status);
    const data = await res.json();
    if (data.content && data.encoding === 'base64') {
      try {
        return decodeURIComponent(escape(atob(data.content.replace(/\n/g, ''))));
      } catch {
        return atob(data.content.replace(/\n/g, ''));
      }
    }
    return data;
  },
  async pushFile(owner, repo, path, content, message, branch) {
    const br = branch || 'claude/shuni-chuntr-va-qil-60bfra';
    let sha;
    try {
      const existing = await fetch(
        'https://api.github.com/repos/' +
          owner +
          '/' +
          repo +
          '/contents/' +
          path +
          '?ref=' +
          br,
        { headers: this._headers() }
      );
      if (existing.ok) sha = (await existing.json()).sha;
    } catch {}
    const body = {
      message: message || 'chore: update via OmniCode',
      content: btoa(unescape(encodeURIComponent(content))),
      branch: br,
    };
    if (sha) body.sha = sha;
    const res = await fetch(
      'https://api.github.com/repos/' + owner + '/' + repo + '/contents/' + path,
      {
        method: 'PUT',
        headers: { ...this._headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );
    if (!res.ok)
      throw new Error('push: ' + res.status + ' ' + (await res.text()).slice(0, 200));
    return res.json();
  },
};

export const FS = {
  read(projectId, path) {
    return Store.get('files_' + projectId, {})[path] ?? null;
  },
  write(projectId, path, content) {
    const files = Store.get('files_' + projectId, {});
    files[path] = content;
    Store.set('files_' + projectId, files);
  },
  index(projectId) {
    return Object.keys(Store.get('files_' + projectId, {}));
  },
  context(projectId) {
    const files = Store.get('files_' + projectId, {});
    const parts = [];
    let total = 0;
    for (const [path, content] of Object.entries(files)) {
      if (total > 10000) break;
      const chunk = String(content).slice(0, 2000);
      parts.push('// ' + path + '\n' + chunk);
      total += chunk.length;
    }
    return parts.join('\n\n');
  },
};

export const PM = {
  list() {
    return Store.get('projects', []);
  },
  current() {
    const id = Store.get('current_project');
    return this.list().find((p) => p.id === id) || null;
  },
  create(name, template = 'blank') {
    const projects = this.list();
    const p = {
      id: 'p_' + Date.now(),
      name,
      template,
      created_at: new Date().toISOString(),
    };
    projects.unshift(p);
    Store.set('projects', projects);
    Store.set('current_project', p.id);
    return p;
  },
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Oddiy line-diff (LCS yo'q — tez, mobil uchun) */
function simpleDiffHtml(oldText, newText) {
  const oldLines = String(oldText || '').split('\n');
  const newLines = String(newText || '').split('\n');
  const oldSet = new Set(oldLines);
  const newSet = new Set(newLines);
  const parts = [];

  // deleted
  for (const line of oldLines) {
    if (!newSet.has(line)) {
      parts.push(
        '<div class="diff-del">- ' + escapeHtml(line) + '</div>'
      );
    }
  }
  // added / same
  for (const line of newLines) {
    if (!oldSet.has(line)) {
      parts.push(
        '<div class="diff-add">+ ' + escapeHtml(line) + '</div>'
      );
    } else {
      parts.push(
        '<div class="diff-same">  ' + escapeHtml(line) + '</div>'
      );
    }
  }
  return parts.join('') || '<div class="diff-same">(bo\'sh)</div>';
}

/**
 * Multi-file DiffView
 * - Nav: 1/N fayl
 * - Har fayl status: pending | applied | skipped
 * - Apply one / Apply all / Reject all
 * - Old (FS) vs New (tool content)
 */
export const DiffView = {
  _queue: [],
  _idx: 0,
  _status: [], // 'pending' | 'applied' | 'skipped' | 'error'

  queue(tools) {
    this._queue = (tools || []).filter(
      (t) => t && (t.name === 'WRITE_FILE' || t.name === 'GH_WRITE_FILE')
    );
    this._idx = 0;
    this._status = this._queue.map(() => 'pending');
    if (this._queue.length) this.show();
    else toast("Diff uchun yozuv yo'q");
  },

  show() {
    $('diff-sheet')?.classList.add('open');
    this.render();
  },

  render() {
    const t = this._queue[this._idx];
    if (!t) return;

    const path = t.attrs?.path || t.name;
    const title = $('diff-title');
    const nav = $('diff-nav');
    const body = $('diff-body');

    const pending = this._status.filter((s) => s === 'pending').length;
    const applied = this._status.filter((s) => s === 'applied').length;

    if (title) {
      title.textContent = path;
    }
    if (nav) {
      nav.textContent =
        this._idx +
        1 +
        ' / ' +
        this._queue.length +
        ' · ✓' +
        applied +
        ' · ⏳' +
        pending +
        ' · ' +
        (this._status[this._idx] || '');
    }

    // File tabs strip
    let tabsHtml = '<div style="display:flex;gap:6px;overflow-x:auto;padding:8px 0 10px;scrollbar-width:none">';
    this._queue.forEach((item, i) => {
      const p = (item.attrs?.path || item.name || '').split('/').pop();
      const st = this._status[i];
      const active = i === this._idx;
      const color =
        st === 'applied'
          ? 'var(--green,#22c55e)'
          : st === 'error'
            ? 'var(--accent,#ff4d4f)'
            : st === 'skipped'
              ? 'var(--text3)'
              : 'var(--text2)';
      tabsHtml +=
        '<button onclick="DiffView.go(' +
        i +
        ')" style="flex-shrink:0;font-size:11px;font-weight:700;padding:5px 10px;border-radius:8px;border:1px solid ' +
        (active ? 'var(--accent)' : 'var(--border)') +
        ';background:' +
        (active ? 'rgba(255,77,79,0.12)' : 'var(--bg3)') +
        ';color:' +
        color +
        ';cursor:pointer">' +
        escapeHtml(p) +
        (st === 'applied' ? ' ✓' : '') +
        '</button>';
    });
    tabsHtml += '</div>';

    // Old content from FS
    const proj = PM.current();
    const oldContent =
      proj && path ? FS.read(proj.id, path) : null;
    const newContent = t.content || '';

    let diffHtml;
    if (oldContent != null && oldContent !== newContent) {
      diffHtml = simpleDiffHtml(oldContent, newContent);
    } else if (oldContent == null) {
      diffHtml =
        '<div style="font-size:11px;color:var(--green);margin-bottom:8px">+ YANGI FAYL</div>' +
        '<pre style="white-space:pre-wrap;margin:0;font-size:12px">' +
        escapeHtml(newContent.slice(0, 12000)) +
        '</pre>';
    } else {
      diffHtml =
        '<div style="font-size:11px;color:var(--text3);margin-bottom:8px">O\'zgarish yo\'q</div>' +
        '<pre style="white-space:pre-wrap;margin:0;font-size:12px">' +
        escapeHtml(newContent.slice(0, 4000)) +
        '</pre>';
    }

    if (body) {
      body.innerHTML =
        tabsHtml +
        '<div class="diff-body" style="font-family:JetBrains Mono,monospace;font-size:12px;line-height:1.65">' +
        diffHtml +
        '</div>' +
        '<div style="display:flex;gap:8px;margin-top:12px">' +
        '<button onclick="DiffView.applyOne()" style="flex:1;background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.35);color:var(--green);padding:10px;border-radius:10px;font-weight:700;cursor:pointer">✓ Shu fayl</button>' +
        '<button onclick="DiffView.skipOne()" style="flex:1;background:var(--bg3);border:1px solid var(--border);color:var(--text2);padding:10px;border-radius:10px;font-weight:700;cursor:pointer">O\'tkazib yubor</button>' +
        '</div>';
    }
  },

  go(i) {
    if (i >= 0 && i < this._queue.length) {
      this._idx = i;
      this.render();
    }
  },

  prev() {
    if (this._idx > 0) {
      this._idx--;
      this.render();
    }
  },

  next() {
    if (this._idx < this._queue.length - 1) {
      this._idx++;
      this.render();
    }
  },

  skipOne() {
    this._status[this._idx] = 'skipped';
    if (this._idx < this._queue.length - 1) this._idx++;
    this.render();
    this._maybeDone();
  },

  async applyOne() {
    const t = this._queue[this._idx];
    if (!t || this._status[this._idx] === 'applied') return;
    try {
      await this._applyTool(t);
      this._status[this._idx] = 'applied';
      toast('✓ ' + (t.attrs?.path || ''));
      if (this._idx < this._queue.length - 1) this._idx++;
      this.render();
      this._maybeDone();
    } catch (e) {
      this._status[this._idx] = 'error';
      toast('Xato: ' + e.message);
      this.render();
    }
  },

  async applyAll() {
    let ok = 0;
    let fail = 0;
    for (let i = 0; i < this._queue.length; i++) {
      if (this._status[i] === 'applied' || this._status[i] === 'skipped') continue;
      try {
        await this._applyTool(this._queue[i]);
        this._status[i] = 'applied';
        ok++;
      } catch (e) {
        this._status[i] = 'error';
        fail++;
        toast('Xato ' + (this._queue[i].attrs?.path || '') + ': ' + e.message);
      }
    }
    this.render();
    toast('Tayyor: ✓' + ok + (fail ? ' ✗' + fail : ''));
    // Reindex RAG if local writes
    try {
      const proj = PM.current();
      if (proj && window.Brain?.reindex) await Brain.reindex();
    } catch {}
    if (fail === 0) {
      setTimeout(() => this.rejectAll(), 600);
    }
  },

  async _applyTool(t) {
    const path = t.attrs?.path;
    if (!path) throw new Error('path yo\'q');
    if (t.name === 'WRITE_FILE') {
      const proj = PM.current();
      if (!proj) throw new Error('Loyiha tanlanmagan');
      FS.write(proj.id, path, t.content || '');
      return;
    }
    if (t.name === 'GH_WRITE_FILE') {
      await Git.pushFile(
        t.attrs.owner || 'xojasoipov-sketch',
        t.attrs.repo || 'Useg-kop',
        path,
        t.content || '',
        t.attrs.message || 'feat: OmniCode multi-file'
      );
      return;
    }
    throw new Error('Noma\'lum tool: ' + t.name);
  },

  _maybeDone() {
    const left = this._status.filter((s) => s === 'pending').length;
    if (left === 0) {
      toast('Barcha fayllar ko\'rib chiqildi');
    }
  },

  rejectAll() {
    this._queue = [];
    this._status = [];
    this._idx = 0;
    $('diff-sheet')?.classList.remove('open');
    toast('Yopildi');
  },
};

export const SB = {
  async syncAll() {
    toast('Supabase sync (stub)');
  },
  async pullAll() {
    toast('Supabase pull (stub)');
  },
};

export const Deploy = {
  async start() {
    toast('Deploy: token/repo sozlang');
    App.nav('deploy');
  },
  clearLogs() {
    const el = $('deploy-logs');
    if (el) el.innerHTML = '';
  },
  setupAndPush() {
    toast('Deploy setup');
  },
};

export const SelfImport = {
  async run() {
    toast('SelfImport...');
    return Brain.runSelf('self_import', '/self');
  },
};
export const SelfHeal = {
  async analyze() {
    toast('SelfHeal...');
    return Brain.runSelf('self_heal', '/fix');
  },
};
export const SelfImprove = {
  async run() {
    toast("O'zini qayta qurish...");
    App.nav('ai');
    return Brain.runSelf('self_rebuild', "O'zingni 0 dan qur va yaxshila");
  },
};

let chatHistory = [];
function appendBubble(msg) {
  const box = $('chat-messages');
  if (!box) return;
  const div = document.createElement('div');
  div.className = 'msg ' + (msg.role === 'user' ? 'user' : 'ai');
  div.style.cssText =
    'padding:10px 14px;margin:8px 12px;border-radius:12px;max-width:90%;' +
    (msg.role === 'user'
      ? 'background:rgba(255,77,79,0.15);margin-left:auto;'
      : 'background:var(--bg3,#1a1a1a);');
  div.textContent = msg.content;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

export const AI = {
  tools: { code: true, files: false, github: false, stream: true },
  toggleTool(el, name) {
    this.tools[name] = !this.tools[name];
    el?.classList.toggle('active', this.tools[name]);
  },
  clear() {
    chatHistory = [];
    const box = $('chat-messages');
    if (box) box.innerHTML = '';
  },
  onKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.send();
    }
  },
  autoGrow(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  },
  async send(forced) {
    const input = $('chat-input');
    const text = (forced || input?.value || '').trim();
    if (!text) return;
    if (input) input.value = '';
    const userMsg = { role: 'user', content: text };
    chatHistory.push(userMsg);
    appendBubble(userMsg);
    try {
      await Brain.handle(text);
    } catch (e) {
      appendBubble({ role: 'assistant', content: 'Xato: ' + e.message });
    }
  },
};

export const Brain = createBrain({
  AIRouter,
  Git,
  FS,
  PM,
  DiffView,
  Deploy,
  SelfImport,
  SelfHeal,
  Store,
  SB,
  getMessages: () => chatHistory,
  onMessage: (m) => {
    chatHistory.push(m);
    appendBubble(m);
  },
  onStatus: (s) => toast(String(s), 1600),
  clearChat: () => AI.clear(),
});

export const App = {
  nav(screen) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
    $(screen)?.classList.add('active');
    $('nav-' + screen)?.classList.add('active');
    if (screen === 'ai') {
      $('ai')?.classList.add('active');
      $('nav-ai')?.classList.add('active');
    }
  },
  newProject() {
    $('new-project-sheet')?.classList.add('open');
  },
  showNotifs() {
    toast("Bildirishnomalar yo'q");
  },
  openModelPicker() {
    $('model-sheet')?.classList.add('open');
    const list = $('model-list');
    if (list) {
      const models = [
        'meta-llama/llama-3.3-70b-instruct:free',
        'google/gemini-2.0-flash-exp:free',
        'llama-3.3-70b-versatile',
      ];
      list.innerHTML = models
        .map(
          (m) =>
            '<div class="pal-item" onclick="Store.set(\x27model\x27,\x27' +
            m +
            '\x27);toast(\x27Model: ' +
            m +
            '\x27);Sheet.close(\x27model-sheet\x27)"><span class="pal-label">' +
            m +
            '</span></div>'
        )
        .join('');
    }
  },
};

export const Sheet = {
  open(id) {
    $(id)?.classList.add('open');
  },
  close(id) {
    $(id)?.classList.remove('open');
  },
  closeOnBg(e, id) {
    if (e.target.id === id) this.close(id);
  },
};

export const Settings = {
  tab(el, name) {
    document.querySelectorAll('.s-tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.s-tab-content').forEach((c) => c.classList.remove('active'));
    el?.classList.add('active');
    $('stab-' + name)?.classList.add('active');
  },
  openConnector(kind) {
    const sheet = $('connector-sheet');
    const fields = $('connector-fields');
    const title = $('connector-sheet-title');
    if (!sheet || !fields) return;
    if (title) title.textContent = kind === 'github' ? 'GitHub Token' : 'API Kalitlar';
    const k = Store.keys();
    if (kind === 'github') {
      fields.innerHTML =
        '<label class="sh-label">PAT</label><input id="key-github" class="sh-input" type="password" placeholder="ghp_..." value="' +
        (k.github || '') +
        '">';
    } else {
      fields.innerHTML =
        '<label class="sh-label">OpenRouter 1</label><input id="key-or1" class="sh-input" type="password" value="' +
        (k.or1 || '') +
        '">' +
        '<label class="sh-label">OpenRouter 2</label><input id="key-or2" class="sh-input" type="password" value="' +
        (k.or2 || '') +
        '">' +
        '<label class="sh-label">Groq</label><input id="key-groq" class="sh-input" type="password" value="' +
        (k.groq || '') +
        '">' +
        '<label class="sh-label">GitHub</label><input id="key-github" class="sh-input" type="password" value="' +
        (k.github || '') +
        '">';
    }
    sheet.classList.add('open');
  },
  openSadiPrime() {
    this.openConnector('ai');
  },
  save() {
    const patch = {};
    for (const id of ['or1', 'or2', 'or3', 'or4', 'groq', 'github']) {
      const el = $('key-' + id);
      if (el) patch[id] = el.value.trim();
    }
    Store.saveKeys(patch);
    toast('Kalitlar saqlandi');
    Sheet.close('connector-sheet');
    this.refreshStatus();
  },
  refreshStatus() {
    const k = Store.keys();
    const gh = $('gh-status');
    if (gh) gh.textContent = k.github ? 'Ulangan' : 'Sozlanmagan';
    const conn = $('conn-github-status');
    if (conn) conn.textContent = k.github ? 'Ulangan' : 'Sozlanmagan';
    const ai = $('conn-ai-status');
    if (ai) ai.textContent = k.or1 || k.groq ? 'Kalit bor' : 'Pollinations (bepul)';
  },
  exportKeys() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(
      new Blob([JSON.stringify(Store.keys(), null, 2)], { type: 'application/json' })
    );
    a.download = 'omnicode-keys.json';
    a.click();
  },
  importKeys() {
    toast('Import stub');
  },
  toggleStream() {
    Store.set('stream', !Store.get('stream', true));
    toast('Stream toggled');
  },
  accentPicker() {
    toast('Accent');
  },
};

export const Palette = {
  open() {
    $('palette-overlay')?.classList.add('open');
    $('palette-input')?.focus();
  },
  close() {
    $('palette-overlay')?.classList.remove('open');
  },
  filter() {},
  onKey(e) {
    if (e.key === 'Escape') this.close();
  },
};

export const Projects = {
  search() {},
  filter() {},
  newProject() {
    const name = $('new-project-name')?.value || 'Loyiha';
    PM.create(name, $('new-project-template')?.value || 'blank');
    toast('Yaratildi: ' + name);
    Sheet.close('new-project-sheet');
    Home.refresh();
  },
};

export const Home = {
  refresh() {
    const box = $('home-projects');
    if (!box) return;
    const list = PM.list();
    box.innerHTML = list.length
      ? list
          .slice(0, 5)
          .map((p) => '<div style="margin:6px 0">' + escapeHtml(p.name) + '</div>')
          .join('')
      : '<div style="text-align:center;padding:16px;color:var(--text3)">Loyiha yo\'q</div>';
  },
};

export const Agents = {
  run(name) {
    toast('Agent: ' + name);
    App.nav('ai');
    AI.send('[Agent:' + name + '] Vazifani bajar');
  },
  runMaster() {
    this.run('master');
  },
  runPipeline(_, agents) {
    toast('Pipeline: ' + (agents || []).join(' → '));
  },
  showRunSheet() {
    Sheet.open('agent-sheet');
  },
  executeTask() {
    const t = $('agent-task-input')?.value;
    if (t) AI.send(t);
    Sheet.close('agent-sheet');
    App.nav('ai');
  },
  createNew() {
    toast('Yangi agent');
  },
};

export const Editor = {
  aiEdit() {
    toast('Editor AI');
  },
  saveToCloud() {
    toast('Cloud');
  },
  format() {
    toast('Format');
  },
  termTab() {},
};
export const Attach = {
  pick() {
    $('file-input')?.click();
  },
  onFiles() {
    toast('Fayl');
  },
};

function boot() {
  Object.assign(window, {
    Store,
    AI,
    App,
    Brain,
    Git,
    DiffView,
    SelfImprove,
    SelfHeal,
    SelfImport,
    Deploy,
    SB,
    Settings,
    Palette,
    Projects,
    Home,
    Agents,
    Editor,
    Attach,
    Sheet,
    Tasks,
    Analytics,
    PM,
    FS,
    AIRouter,
  });
  Settings.refreshStatus();
  Home.refresh();
  const hour = new Date().getHours();
  const g = $('greeting-text');
  if (g)
    g.textContent =
      hour < 12 ? 'Xayrli tong' : hour < 18 ? 'Xayrli kun' : 'Xayrli kech';
  console.log('OmniCode app.js v3.2 + multi-file DiffView');
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
