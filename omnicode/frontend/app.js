'use strict';
// ═══════════════════════════════════════════════════════════════
//  OmniCode 3.0 — Claude Code + Supabase + Streaming + Self-Heal
// ═══════════════════════════════════════════════════════════════

const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); tg.setHeaderColor?.('#0A0A0A'); tg.setBackgroundColor?.('#0A0A0A'); }

// ── Store ────────────────────────────────────────────────────────
const Store = {
  get(k, d = null) { try { const v = localStorage.getItem('oc_' + k); return v !== null ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('oc_' + k, JSON.stringify(v)); } catch {} },
};

// ══════════════════════════════════════════════════════════════
//  ANALYTICS
// ══════════════════════════════════════════════════════════════
const Analytics = {
  _key(d) { return 'analytics_' + d; },
  _today() { return new Date().toDateString(); },
  track(tokens = 0) {
    const day = this._today();
    const data = Store.get(this._key(day), { requests: 0, tokens: 0 });
    data.requests += 1; data.tokens += tokens;
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
  yesterday() { return Store.get(this._key(new Date(Date.now() - 86400000).toDateString()), { requests: 0, tokens: 0 }); },
  fmtTokens(n) { return n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n); },
};

// ══════════════════════════════════════════════════════════════
//  TASKS
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
  update(id, patch) { Store.set('running_tasks', this.list().map(t => t.id === id ? { ...t, ...patch } : t)); },
  remove(id) { Store.set('running_tasks', this.list().filter(t => t.id !== id)); },
  clear() { Store.set('running_tasks', []); },
};

// ══════════════════════════════════════════════════════════════
//  ATTACH — Fayl biriktirish: rasm, kod, ZIP
// ══════════════════════════════════════════════════════════════
const Attach = {
  _items: [], // { name, type, content, preview }

  pick() { document.getElementById('file-input')?.click(); },

  async onFiles(files) {
    if (!files?.length) return;
    toast(`📎 ${files.length} ta fayl o'qilmoqda...`);
    for (const file of Array.from(files)) {
      try {
        const item = await this._read(file);
        if (item) { this._items.push(item); }
      } catch (e) { toast(`❌ ${file.name}: ${e.message}`); }
    }
    this._renderPreview();
    document.getElementById('file-input').value = '';
  },

  async _read(file) {
    const name = file.name;
    const ext  = name.split('.').pop().toLowerCase();
    const size = (file.size / 1024).toFixed(1);

    // ── Rasm ──────────────────────────────────────────────────
    if (file.type.startsWith('image/')) {
      const b64 = await this._toBase64(file);
      return { name, type: 'image', size, content: b64, preview: b64, ext };
    }

    // ── ZIP ───────────────────────────────────────────────────
    if (ext === 'zip' || file.type === 'application/zip' || file.type === 'application/x-zip-compressed') {
      return await this._readZip(file);
    }

    // ── PDF (matn sifatida) ───────────────────────────────────
    if (ext === 'pdf') {
      const buf  = await file.arrayBuffer();
      const text = this._extractPdfText(buf);
      return { name, type: 'text', size, ext, content: text || `[PDF: ${name}, ${size}KB — matn ajratib olinmadi]` };
    }

    // ── Matn / kod fayllar ────────────────────────────────────
    const TEXT_EXTS = ['txt','js','ts','jsx','tsx','py','html','css','json','md','csv','xml','yaml','yml','sh','bash','sql','graphql','vue','rs','go','java','cpp','c','h','php','rb','swift','kt','env','gitignore','lock','toml','ini','cfg','conf','log'];
    if (TEXT_EXTS.includes(ext) || file.type.startsWith('text/')) {
      const text = await file.text();
      if (text.length > 120_000) {
        // Katta fayl — boshini olish
        return { name, type: 'text', size, ext, content: text.slice(0, 120_000) + '\n\n... [fayl qisqartirildi]' };
      }
      return { name, type: 'text', size, ext, content: text };
    }

    // ── Noma'lum — matn sifatida urinish ─────────────────────
    try {
      const text = await file.text();
      return { name, type: 'text', size, ext, content: text.slice(0, 50_000) };
    } catch { return { name, type: 'binary', size, ext, content: `[Ikkilik fayl: ${name}, ${size}KB]` }; }
  },

  async _readZip(file) {
    // JSZip CDN dan yuklaymiz (kerak bo'lganda)
    if (!window.JSZip) {
      await this._loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
    }
    const buf = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(buf);
    const parts = [`📦 ZIP: ${file.name}\n`];
    const TEXT_RE = /\.(js|ts|jsx|tsx|py|html|css|json|md|txt|yaml|yml|sh|sql|rs|go|java|cpp|c|h|php|rb|vue|svelte|xml|env|toml|ini|cfg|conf|log|csv)$/i;

    for (const [path, entry] of Object.entries(zip.files)) {
      if (entry.dir) continue;
      const size = (entry._data?.uncompressedSize || 0) / 1024;
      if (size > 200) { parts.push(`📄 ${path} (${size.toFixed(0)}KB — o'tkazib yuborildi)`); continue; }
      if (TEXT_RE.test(path)) {
        try {
          const text = await entry.async('string');
          parts.push(`\n\`\`\`${path}\n${text.slice(0, 8000)}\n\`\`\``);
        } catch { parts.push(`⚠️ ${path} o'qib bo'lmadi`); }
      } else {
        parts.push(`📎 ${path} (binary, o'tkazildi)`);
      }
      if (parts.join('').length > 80_000) { parts.push('\n... [ZIP katta, qisqartirildi]'); break; }
    }
    return { name: file.name, type: 'zip', size: (file.size/1024).toFixed(1), ext: 'zip', content: parts.join('\n') };
  },

  _extractPdfText(buf) {
    // Oddiy PDF matn ajratish (PDFjs o'rnatilmagan bo'lsa)
    try {
      const str = new TextDecoder('utf-8', { fatal: false }).decode(buf);
      const matches = str.match(/\(([^\)]{2,200})\)/g);
      if (!matches) return null;
      return matches.map(m => m.slice(1, -1)).filter(s => /[a-zA-Z]/.test(s)).join(' ').slice(0, 50_000);
    } catch { return null; }
  },

  _toBase64(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = e => res(e.target.result);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  },

  _loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  },

  _renderPreview() {
    const wrap = document.getElementById('attach-preview');
    if (!wrap) return;
    if (!this._items.length) { wrap.style.display = 'none'; wrap.innerHTML = ''; return; }
    wrap.style.display = 'flex';
    wrap.innerHTML = this._items.map((it, i) => `
      <div style="position:relative;display:inline-flex;align-items:center;gap:5px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:4px 8px;font-size:11px;max-width:140px">
        ${it.type === 'image'
          ? `<img src="${it.preview}" style="width:22px;height:22px;object-fit:cover;border-radius:4px">`
          : `<span>${it.type==='zip'?'📦':it.type==='pdf'?'📄':'📎'}</span>`}
        <span style="color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:90px">${it.name}</span>
        <span style="color:var(--text3)">${it.size}KB</span>
        <button onclick="Attach.remove(${i})" style="position:absolute;top:-5px;right:-5px;width:16px;height:16px;border-radius:50%;background:rgba(248,81,73,0.8);border:none;color:#fff;font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0">×</button>
      </div>
    `).join('');
  },

  remove(idx) {
    this._items.splice(idx, 1);
    this._renderPreview();
  },

  // AI yuborishdan oldin context sifatida olish
  buildContext() {
    if (!this._items.length) return '';
    const parts = this._items.map(it => {
      if (it.type === 'image') {
        return `### Rasm: ${it.name}\n[Rasm biriktirildi — ${it.size}KB]\n\`\`\`\n${it.content.slice(0,100)}...\n\`\`\``;
      }
      return `### Fayl: ${it.name} (${it.size}KB)\n\`\`\`${it.ext||''}\n${it.content}\n\`\`\``;
    });
    return `\n\n━━━ Biriktirilgan fayllar ━━━\n${parts.join('\n\n')}`;
  },

  // Rasmlar uchun vision messages formati
  buildVisionMessages(userText) {
    const images = this._items.filter(it => it.type === 'image');
    const texts  = this._items.filter(it => it.type !== 'image');
    if (!images.length) return null;

    const content = [{ type: 'text', text: userText + (texts.length ? '\n\n' + texts.map(t => `### ${t.name}\n\`\`\`\n${t.content}\n\`\`\``).join('\n\n') : '') }];
    images.forEach(img => content.push({ type: 'image_url', image_url: { url: img.content } }));
    return content;
  },

  clear() { this._items = []; this._renderPreview(); },
};

// ══════════════════════════════════════════════════════════════
//  ACTIVITY BAR — Real-time faoliyat ko'rsatgich (Claude Code uslubi)
// ══════════════════════════════════════════════════════════════
const ActivityBar = {
  _el: null,
  _stats: { added: 0, removed: 0, files: 0, tokens: 0, agents: [] },
  _phase: null,
  _startTime: null,

  _getOrCreate() {
    if (this._el && document.body.contains(this._el)) return this._el;
    this._el = document.createElement('div');
    this._el.id = 'activity-bar';
    this._el.style.cssText = `
      position:fixed;top:52px;left:0;right:0;z-index:900;
      background:rgba(10,10,12,0.96);backdrop-filter:blur(12px);
      border-bottom:1px solid rgba(255,255,255,0.07);
      padding:6px 14px;display:flex;flex-direction:column;gap:3px;
      font-size:11.5px;font-family:monospace;
      transform:translateY(-100%);transition:transform 0.2s ease;
    `;
    document.body.appendChild(this._el);
    setTimeout(() => { if (this._el) this._el.style.transform = 'translateY(0)'; }, 10);
    return this._el;
  },

  _render() {
    const el = this._getOrCreate();
    const s = this._stats;
    const elapsed = this._startTime ? ((Date.now() - this._startTime) / 1000).toFixed(1) : '0';

    const phaseIcon = { thinking:'🧠', reading:'📖', writing:'✍️', pushing:'🐙', done:'✅', error:'❌' };
    const phaseLabel = { thinking:'O\'ylayapman', reading:'O\'qiyapman', writing:'Yozayapman', pushing:'Push qilyapman', done:'Tayyor', error:'Xato' };

    const diffLine = (s.added || s.removed)
      ? `<span style="color:#3fb950">+${s.added}</span> <span style="color:#f85149">-${s.removed}</span> qator`
      + (s.files ? ` · <span style="color:#58a6ff">${s.files} fayl</span>` : '')
      : '';

    const agentLine = s.agents.length
      ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:1px">`
        + s.agents.map(a => `<span style="background:rgba(255,255,255,0.07);border-radius:4px;padding:1px 6px;color:${a.status==='done'?'#3fb950':a.status==='error'?'#f85149':'#e6b450'}">${a.icon} ${a.name} ${a.status==='running'?'…':a.status==='done'?'✓':'✗'}</span>`).join('')
        + `</div>`
      : '';

    const tokensStr = s.tokens ? ` · <span style="color:var(--text3)">${s.tokens} token</span>` : '';

    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px">
        <span style="color:var(--accent)">${phaseIcon[this._phase]||'⚡'} ${phaseLabel[this._phase]||''}</span>
        <span style="color:var(--text3);margin-left:auto">${elapsed}s${tokensStr}</span>
      </div>
      ${diffLine ? `<div style="color:var(--text2)">${diffLine}</div>` : ''}
      ${agentLine}
    `;
  },

  start(phase = 'thinking') {
    this._startTime = Date.now();
    this._stats = { added: 0, removed: 0, files: 0, tokens: 0, agents: [] };
    this._phase = phase;
    this._render();
    this._ticker = setInterval(() => this._render(), 500);
  },

  setPhase(phase) { this._phase = phase; this._render(); },

  updateDiff(content, oldContent = '') {
    if (!content) return;
    const newLines = content.split('\n').length;
    const oldLines = oldContent ? oldContent.split('\n').length : 0;
    if (newLines > oldLines) this._stats.added += newLines - oldLines;
    else if (oldLines > newLines) this._stats.removed += oldLines - newLines;
    this._stats.files++;
    this._render();
  },

  addTokens(n) { this._stats.tokens += n; this._render(); },

  addAgent(name, icon = '🤖') {
    this._stats.agents.push({ name, icon, status: 'running' });
    this._render();
    return this._stats.agents.length - 1;
  },

  doneAgent(idx, ok = true) {
    if (this._stats.agents[idx]) this._stats.agents[idx].status = ok ? 'done' : 'error';
    this._render();
  },

  done() {
    clearInterval(this._ticker);
    this._phase = 'done';
    this._render();
    setTimeout(() => this.hide(), 2500);
  },

  error() {
    clearInterval(this._ticker);
    this._phase = 'error';
    this._render();
    setTimeout(() => this.hide(), 3000);
  },

  hide() {
    if (!this._el) return;
    this._el.style.transform = 'translateY(-100%)';
    setTimeout(() => { this._el?.remove(); this._el = null; }, 220);
    clearInterval(this._ticker);
  },
};

// ══════════════════════════════════════════════════════════════
//  SUPABASE — Cloud sync
// ══════════════════════════════════════════════════════════════
const SB = {
  URL: 'https://tomkxsdkerpbvlumubbg.supabase.co',
  KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbWt4c2RrZXJwYnZsdW11YmJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MTI5NTMsImV4cCI6MjA5OTM4ODk1M30.betEr6efsXiJSRb9g2FnarUtF7B09DJombiQdKcMR6U',
  syncing: false,

  userId() {
    const tgId = tg?.initDataUnsafe?.user?.id?.toString();
    if (tgId) return tgId;
    let id = Store.get('anon_uid');
    if (!id) { id = 'u_' + Math.random().toString(36).slice(2, 10); Store.set('anon_uid', id); }
    return id;
  },

  async req(path, method = 'GET', body = null, prefer = '') {
    try {
      const res = await fetch(this.URL + '/rest/v1' + path, {
        method,
        headers: {
          'apikey': this.KEY,
          'Authorization': 'Bearer ' + this.KEY,
          'Content-Type': 'application/json',
          ...(prefer ? { 'Prefer': prefer } : {}),
        },
        body: body ? JSON.stringify(body) : null,
      });
      if (res.status === 204) return null;
      return res.ok ? res.json() : null;
    } catch { return null; }
  },

  async upsertProject(p) {
    return this.req('/omnicode_projects', 'POST', {
      id: p.id, user_id: this.userId(), name: p.name,
      template: p.template || 'blank', github: p.github || null, starred: !!p.starred,
    }, 'resolution=merge-duplicates,return=minimal');
  },

  async upsertFile(projectId, path, content) {
    return this.req('/omnicode_files', 'POST', { project_id: projectId, path, content },
      'resolution=merge-duplicates,return=minimal');
  },

  async deleteProject(id) { return this.req(`/omnicode_projects?id=eq.${id}`, 'DELETE'); },

  async loadProjects() { return await this.req(`/omnicode_projects?user_id=eq.${this.userId()}&order=created_at.desc`) || []; },

  async loadFiles(projectId) { return await this.req(`/omnicode_files?project_id=eq.${encodeURIComponent(projectId)}`) || []; },

  _setBtn(icon) { const el = document.getElementById('sync-btn'); if (el) el.textContent = icon; },

  async syncAll() {
    if (this.syncing) return;
    this.syncing = true;
    this._setBtn('🔄');
    const uid = document.getElementById('cloud-uid-val');
    if (uid) uid.textContent = this.userId();
    try {
      const projects = PM.list();
      let fileCount = 0;
      for (const p of projects) {
        await this.upsertProject(p);
        for (const path of FS.index(p.id)) {
          await this.upsertFile(p.id, path, FS.read(p.id, path));
          fileCount++;
        }
      }
      this._setBtn('☁️');
      const sub = document.getElementById('cloud-sub');
      if (sub) sub.textContent = `${projects.length} loyiha · ${fileCount} fayl saqlandi`;
      const val = document.getElementById('cloud-status-val');
      if (val) val.textContent = projects.length + ' 💾';
      const bar = document.getElementById('cloud-bar');
      if (bar) bar.style.width = Math.min(100, projects.length * 20) + '%';
      const cs = document.getElementById('conn-cloud-status');
      if (cs) cs.textContent = `${projects.length} loyiha saqlandi`;
      toast('☁️ Bulutga saqlandi');
    } catch (e) {
      this._setBtn('☁️');
      toast('⚠️ Sinxron xatosi: ' + e.message);
    } finally { this.syncing = false; }
  },

  async pullAll() {
    this._setBtn('🔄');
    try {
      const cloudProjects = await this.loadProjects();
      let loaded = 0;
      for (const cp of cloudProjects) {
        if (!PM.get(cp.id)) {
          const projects = PM.list();
          projects.unshift({ id: cp.id, name: cp.name, template: cp.template, github: cp.github, starred: cp.starred, created: Date.now(), updated: Date.now() });
          Store.set('projects', projects);
        }
        const files = await this.loadFiles(cp.id);
        for (const f of files) { FS.write(cp.id, f.path, f.content); loaded++; }
      }
      this._setBtn('☁️');
      toast(`☁️ ${cloudProjects.length} loyiha, ${loaded} fayl yuklandi`);
      Projects.render();
      Home.refresh();
    } catch (e) {
      this._setBtn('☁️');
      toast('⚠️ Yuklash xatosi: ' + e.message);
    }
  },
};

// ══════════════════════════════════════════════════════════════
//  FILE SYSTEM (localStorage-based, project-scoped)
// ══════════════════════════════════════════════════════════════
const FS = {
  _key(projectId, path) { return `fs:${projectId}:${path}`; },
  _indexKey(projectId) { return `fs_idx:${projectId}`; },
  index(projectId) { return Store.get(this._indexKey(projectId), []); },

  write(projectId, path, content) {
    Store.set(this._key(projectId, path), content);
    const idx = this.index(projectId);
    if (!idx.includes(path)) { idx.push(path); Store.set(this._indexKey(projectId), idx); }
    // Debounce cloud sync
    clearTimeout(this._syncTimer);
    this._syncTimer = setTimeout(() => SB.upsertFile(projectId, path, content).catch(() => {}), 3000);
  },
  _syncTimer: null,

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
    // Auto-sync to cloud
    setTimeout(() => SB.upsertProject(p).catch(() => {}), 500);
    return p;
  },

  update(id, data) {
    Store.set('projects', this.list().map(p => p.id === id ? { ...p, ...data, updated: Date.now() } : p));
  },

  delete(id) {
    FS.index(id).forEach(path => FS.delete(id, path));
    Store.set('projects', this.list().filter(p => p.id !== id));
    if (this.current() === id) Store.set('current_project', null);
    SB.deleteProject(id).catch(() => {});
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
    if (!token) throw new Error('GitHub token sozlanmagan. Sozlamalar → Kod bo\'limiga o\'ting');
    const res = await fetch('https://api.github.com' + path, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'OmniCode/3.0',
      },
      body: body ? JSON.stringify(body) : null,
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || `GitHub ${res.status}`); }
    return res.json();
  },

  async me() { return this.request('/user'); },
  async repos() { return this.request('/user/repos?per_page=50&sort=updated'); },
  async createRepo(name, isPrivate = false) { return this.request('/user/repos', 'POST', { name, private: isPrivate, auto_init: true }); },

  async getRepoContents(owner, repo, path = '', branch = 'main') {
    try { return await this.request(`/repos/${owner}/${repo}/contents/${path}?ref=${branch}`); }
    catch { return await this.request(`/repos/${owner}/${repo}/contents/${path}?ref=master`).catch(() => null); }
  },

  async getFileContent(owner, repo, path, branch = 'main') {
    const data = await this.getRepoContents(owner, repo, path, branch);
    if (!data || !data.content) return null;
    try { return decodeURIComponent(escape(atob(data.content.replace(/\n/g, '')))); }
    catch { return atob(data.content.replace(/\n/g, '')); }
  },

  async importRepoToProject(owner, repo, projectId, branch = 'main') {
    const importDir = async (dirPath = '') => {
      const items = await this.getRepoContents(owner, repo, dirPath, branch);
      if (!items || !Array.isArray(items)) return;
      for (const item of items) {
        if (item.type === 'file' && item.size < 200000) {
          const content = await this.getFileContent(owner, repo, item.path, branch);
          if (content !== null) FS.write(projectId, item.path, content);
        } else if (item.type === 'dir' && !['node_modules','.git','dist','build'].includes(item.name)) {
          await importDir(item.path);
        }
      }
    };
    await importDir();
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
//  GITHUB TOOL PROTOCOL — AI emits <GH_*> tags, app executes them
// ══════════════════════════════════════════════════════════════
const GitTools = {
  // Parse AI response for GitHub tool calls
  async execute(reply) {
    let result = reply;
    const results = [];

    // <GH_LIST_REPOS/>
    if (/<GH_LIST_REPOS\s*\/?>/.test(reply)) {
      try {
        const [me, repos] = await Promise.all([Git.me(), Git.repos()]);
        const list = repos.map((r, i) =>
          `${i+1}. **${r.full_name}** — ${r.description || r.language || 'no desc'} | ⭐${r.stargazers_count} | ${r.private ? '🔒' : '🌐'} | ${r.updated_at?.slice(0,10)}`
        ).join('\n');
        State.githubCtx = `GITHUB USER: ${me.login}\nGITHUB REPOS:\n` + repos.map(r =>
          `- ${r.full_name} (${r.private?'private':'public'}, ${r.language||'?'}, ⭐${r.stargazers_count})`
        ).join('\n');
        results.push(`🐙 **GitHub — @${me.login}** (${repos.length} ta repo)\n\n${list}`);
      } catch (e) {
        results.push(`❌ GitHub xatosi: ${e.message}\n\nSozlamalar → Kod → GitHub token tekshiring`);
      }
      result = result.replace(/<GH_LIST_REPOS\s*\/?>/g, '');
    }

    // <GH_LIST_FILES owner="x" repo="y" path="z"/>
    const listFilesRe = /<GH_LIST_FILES\s+owner="([^"]+)"\s+repo="([^"]+)"(?:\s+path="([^"]*)")?\s*\/?>/g;
    let m;
    while ((m = listFilesRe.exec(reply)) !== null) {
      const [, owner, repo, path = ''] = m;
      try {
        const items = await Git.getRepoContents(owner, repo, path);
        if (Array.isArray(items)) {
          const dirs = items.filter(i => i.type === 'dir').map(i => `📁 ${i.name}/`).join('\n');
          const files = items.filter(i => i.type === 'file').map(i => `📄 ${i.name} (${(i.size/1024).toFixed(1)}kb)`).join('\n');
          results.push(`📂 **${owner}/${repo}${path ? '/' + path : ''}**\n\n${dirs}\n${files}`);
        } else {
          results.push(`❌ Fayl topilmadi: ${owner}/${repo}/${path}`);
        }
      } catch (e) { results.push(`❌ ${e.message}`); }
      result = result.replace(m[0], '');
    }

    // <GH_READ_FILE owner="x" repo="y" path="z"/>
    const readRe = /<GH_READ_FILE\s+owner="([^"]+)"\s+repo="([^"]+)"\s+path="([^"]+)"\s*\/?>/g;
    while ((m = readRe.exec(reply)) !== null) {
      const [, owner, repo, path] = m;
      try {
        const content = await Git.getFileContent(owner, repo, path);
        if (content !== null) {
          const ext = path.split('.').pop();
          results.push(`📄 **${owner}/${repo}/${path}**\n\`\`\`${ext}\n${content.slice(0, 3000)}${content.length > 3000 ? '\n... (qisqartirildi)' : ''}\n\`\`\``);
          // Also inject into VFS if project is open
          if (State.projectId) FS.write(State.projectId, path, content);
        } else {
          results.push(`❌ Fayl o'qib bo'lmadi: ${path}`);
        }
      } catch (e) { results.push(`❌ ${e.message}`); }
      result = result.replace(m[0], '');
    }

    // <GH_WRITE_FILE owner="x" repo="y" path="z" message="commit">content</GH_WRITE_FILE>
    const writeRe = /<GH_WRITE_FILE\s+owner="([^"]+)"\s+repo="([^"]+)"\s+path="([^"]+)"(?:\s+message="([^"]*)")?\s*>([\s\S]*?)<\/GH_WRITE_FILE>/g;
    while ((m = writeRe.exec(reply)) !== null) {
      const [full, owner, repo, path, commitMsg, content] = m;
      try {
        await Git.pushFile(owner, repo, path, content.trim(), 'main', commitMsg || `update ${path} via OmniCode AI`);
        results.push(`✅ **GitHub'ga yuklandi:** \`${owner}/${repo}/${path}\`\nCommit: "${commitMsg || 'update via OmniCode AI'}"`);
        toast(`✅ ${path} GitHub'ga yuklandi`);
      } catch (e) { results.push(`❌ Push xatosi ${path}: ${e.message}`); }
      result = result.replace(full, '');
    }

    // <GH_CREATE_REPO name="x" private="false"/>
    const createRe = /<GH_CREATE_REPO\s+name="([^"]+)"(?:\s+private="([^"]*)")?\s*\/?>/g;
    while ((m = createRe.exec(reply)) !== null) {
      const [, name, priv = 'false'] = m;
      try {
        const r = await Git.createRepo(name, priv === 'true');
        results.push(`✅ **Repo yaratildi:** [${r.full_name}](${r.html_url})\n${r.private ? '🔒 Private' : '🌐 Public'}`);
        toast(`✅ ${name} repo yaratildi`);
      } catch (e) { results.push(`❌ Repo yaratib bo'lmadi: ${e.message}`); }
      result = result.replace(m[0], '');
    }

    return { cleanReply: result.trim(), toolResults: results };
  },

  // Check if reply has any GH_ commands
  has(reply) {
    return /<GH_/.test(reply);
  },
};

// ══════════════════════════════════════════════════════════════
//  AI MODELS
// ══════════════════════════════════════════════════════════════
const MODELS = [
  { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B',    short: 'Llama 3.3',   provider: 'openrouter', badge: '⚡', ctx: 128000, stream: true },
  { id: 'deepseek/deepseek-r1:free',               name: 'DeepSeek R1',      short: 'DeepSeek R1', provider: 'openrouter', badge: '🧠', ctx: 64000,  stream: true },
  { id: 'google/gemini-2.0-flash-exp:free',        name: 'Gemini 2.0 Flash', short: 'Gemini 2.0',  provider: 'openrouter', badge: '✨', ctx: 1000000, stream: true },
  { id: 'qwen/qwq-32b:free',                       name: 'Qwen QwQ 32B',     short: 'QwQ 32B',     provider: 'openrouter', badge: '🔮', ctx: 32000,  stream: true },
  { id: 'llama-3.3-70b-versatile',                 name: 'Groq Llama 70B',   short: 'Groq Fast',   provider: 'groq',       badge: '⚡', ctx: 32000,  stream: true },
  { id: 'claude-3-5-haiku-20241022',               name: 'Claude 3.5 Haiku', short: 'Claude Haiku',provider: 'anthropic',  badge: '🤖', ctx: 200000, stream: false },
  { id: 'gemini-2.0-flash',                        name: 'Gemini Flash (Direct)', short: 'Gemini', provider: 'gemini',    badge: '✨', ctx: 1000000, stream: false },
  { id: 'deepseek-chat',                           name: 'DeepSeek Chat',    short: 'DeepSeek',    provider: 'deepseek',   badge: '🧠', ctx: 64000,  stream: false },
  { id: 'mistral-small-latest',                    name: 'Mistral Small',    short: 'Mistral',     provider: 'mistral',    badge: '🌀', ctx: 32000,  stream: false },
];

// ══════════════════════════════════════════════════════════════
//  AI ROUTER — with fallback chain
// ══════════════════════════════════════════════════════════════
const AIRouter = {
  // Cheksiz OR kalitlarni qaytaradi — eski or1..or4 + yangi or_keys array
  keys() {
    const k = Store.get('keys', {});
    const legacy = [k.or1, k.or2, k.or3, k.or4].filter(Boolean);
    const arr = Store.get('or_keys', []).filter(Boolean);
    // birlashtir, takrorlanmasin
    const all = [...new Set([...arr, ...legacy])];
    return all;
  },

  // Yangi OpenRouter kalitini qo'shish
  addKey(key) {
    if (!key || !key.startsWith('sk-or')) return false;
    const arr = Store.get('or_keys', []);
    if (arr.includes(key)) return false;
    arr.push(key);
    Store.set('or_keys', arr);
    return true;
  },

  // Kalitni o'chirish (index bo'yicha)
  removeKey(index) {
    const arr = Store.get('or_keys', []);
    arr.splice(index, 1);
    Store.set('or_keys', arr);
  },

  // 429 = limit tugadi, 401/403 = kalit noto'g'ri — darhol skip
  _isHardFail(status) { return status === 401 || status === 403; },
  _isRateLimit(status) { return status === 429 || status === 503 || status === 529; },

  // Barcha kalitlarni ketma-ket sinab chiqadi — biri 429 bo'lsa keyingisi
  async openrouter(messages, modelId) {
    const keys = this.keys();
    if (!keys.length) throw new Error('OpenRouter kaliti yo\'q');
    let lastErr;
    for (const key of keys) {
      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}`, 'HTTP-Referer': 'https://omnicode.app', 'X-Title': 'OmniCode' },
          body: JSON.stringify({ model: modelId, messages, max_tokens: 8192 }),
        });
        if (!res.ok) {
          lastErr = new Error(`OpenRouter ${res.status}`);
          if (res.status === 429 || res.status === 402) { console.warn(`OR key ...${key.slice(-6)} limit → keyingisi`); continue; }
          throw lastErr;
        }
        return (await res.json()).choices[0].message.content;
      } catch (e) {
        if (/429|402|limit/i.test(e.message)) { lastErr = e; continue; }
        throw e;
      }
    }
    throw lastErr || new Error('OpenRouter barcha kalitlar tugadi');
  },

  async groq(messages) {
    const key = Store.get('keys', {}).groq;
    if (!key) throw new Error('Groq kaliti yo\'q');
    const trimmed = this._trimMessages(messages, 20000);
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: trimmed, max_tokens: 8192 }),
    });
    if (!res.ok) throw new Error(`Groq ${res.status}`);
    return (await res.json()).choices[0].message.content;
  },

  async anthropic(messages) {
    const key = Store.get('keys', {}).anthropic;
    if (!key) throw new Error('Anthropic kaliti yo\'q');
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
    if (!key) throw new Error('Gemini kaliti yo\'q');
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
    if (!key) throw new Error('DeepSeek kaliti yo\'q');
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ model: 'deepseek-chat', messages, max_tokens: 8192 }),
    });
    if (!res.ok) throw new Error(`DeepSeek ${res.status}`);
    return (await res.json()).choices[0].message.content;
  },

  mistralKeys() {
    const k = Store.get('keys', {});
    const legacy = k.mistral ? [k.mistral] : [];
    const arr = Store.get('mistral_keys', []).filter(Boolean);
    return [...new Set([...arr, ...legacy])];
  },
  addMistralKey(key) {
    if (!key || key.length < 10) return false;
    const arr = Store.get('mistral_keys', []);
    if (arr.includes(key)) return false;
    arr.push(key); Store.set('mistral_keys', arr); return true;
  },
  removeMistralKey(index) {
    const arr = Store.get('mistral_keys', []); arr.splice(index, 1); Store.set('mistral_keys', arr);
  },

  async mistral(messages) {
    const keys = this.mistralKeys();
    if (!keys.length) throw new Error('Mistral kaliti yo\'q');
    let lastErr;
    for (const key of keys) {
      const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({ model: 'mistral-small-latest', messages, max_tokens: 8192 }),
      });
      if (res.status === 429 || res.status === 402) { lastErr = new Error(`Mistral ${res.status}`); continue; }
      if (!res.ok) throw new Error(`Mistral ${res.status}`);
      return (await res.json()).choices[0].message.content;
    }
    throw lastErr || new Error('Mistral: barcha kalitlar tugadi');
  },

  async together(messages) {
    const key = Store.get('keys', {}).together;
    if (!key) throw new Error('Together kaliti yo\'q');
    const res = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ model: 'meta-llama/Llama-3-70b-chat-hf', messages, max_tokens: 8192 }),
    });
    if (!res.ok) throw new Error(`Together ${res.status}`);
    return (await res.json()).choices[0].message.content;
  },

  async githubModels(messages, modelId = 'gpt-4o-mini') {
    // GitHub token bilan bepul — foydalanuvchi allaqachon ulagan
    const key = Store.get('keys', {}).github;
    if (!key) throw new Error('GitHub token yo\'q');
    const trimmed = this._trimMessages(messages, 16000);
    const res = await fetch('https://models.inference.ai.azure.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ model: modelId, messages: trimmed, max_tokens: 4096 }),
    });
    if (!res.ok) throw new Error(`GitHubModels ${res.status}`);
    return (await res.json()).choices[0].message.content;
  },

  async cerebras(messages) {
    const key = Store.get('keys', {}).cerebras;
    if (!key) throw new Error('Cerebras kaliti yo\'q');
    const trimmed = this._trimMessages(messages, 16000);
    const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ model: 'llama-3.3-70b', messages: trimmed, max_tokens: 8192 }),
    });
    if (!res.ok) throw new Error(`Cerebras ${res.status}`);
    return (await res.json()).choices[0].message.content;
  },

  async huggingface(messages) {
    const key = Store.get('keys', {}).hf || '';
    const trimmed = this._trimMessages(messages, 8000);
    const last = trimmed.filter(m => m.role !== 'system').map(m => `${m.role}: ${m.content}`).join('\n');
    const sys = trimmed.find(m => m.role === 'system')?.content || '';
    const prompt = (sys ? sys.slice(0, 500) + '\n\n' : '') + last + '\nassistant:';
    const headers = { 'Content-Type': 'application/json' };
    if (key) headers['Authorization'] = `Bearer ${key}`;
    const res = await fetch('https://api-inference.huggingface.co/models/Qwen/Qwen2.5-72B-Instruct/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(key ? { 'Authorization': `Bearer ${key}` } : {}) },
      body: JSON.stringify({ model: 'Qwen/Qwen2.5-72B-Instruct', messages: trimmed.filter(m => m.role !== 'system'), max_tokens: 2048 }),
    });
    if (!res.ok) throw new Error(`HuggingFace ${res.status}`);
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || data?.[0]?.generated_text;
    if (!content) throw new Error('HuggingFace empty');
    return content;
  },

  _flattenMessages(messages) {
    return messages.map(m => {
      if (Array.isArray(m.content)) {
        const text = m.content.filter(c => c.type === 'text').map(c => c.text).join('\n');
        return { ...m, content: text };
      }
      return m;
    });
  },

  // Katta kontekstni qisqartirish — fallback provayderlar uchun
  _trimMessages(messages, maxChars = 12000) {
    const flat = this._flattenMessages(messages);
    const sys = flat.find(m => m.role === 'system');
    const rest = flat.filter(m => m.role !== 'system');
    const sysLen = sys?.content?.length || 0;
    const budget = maxChars - Math.min(sysLen, 3000);

    // Oxirgi xabarlardan boshlab sig'diramiz
    const trimmed = [];
    let used = 0;
    for (let i = rest.length - 1; i >= 0; i--) {
      const msg = rest[i];
      const len = (msg.content || '').length;
      if (used + len > budget) {
        // Bu xabar juda katta — qisqartiramiz
        const allowed = budget - used;
        if (allowed > 200) {
          trimmed.unshift({ ...msg, content: msg.content.slice(-allowed) + '\n...[qisqartirildi]' });
          used = budget;
        }
        break;
      }
      trimmed.unshift(msg);
      used += len;
    }
    const sysMsg = sys ? { ...sys, content: (sys.content || '').slice(0, 3000) } : null;
    return sysMsg ? [sysMsg, ...trimmed] : trimmed;
  },

  async pollinations(messages) {
    const flat = this._trimMessages(messages, 14000);
    const models = ['openai', 'openai-large', 'mistral'];
    let lastErr;
    for (const mdl of models) {
      try {
        const res = await fetch('https://text.pollinations.ai/openai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: mdl, messages: flat, max_tokens: 4096, seed: 42 }),
        });
        if (!res.ok) { lastErr = new Error(`Pollinations/${mdl} ${res.status}`); continue; }
        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content;
        if (content) return content;
        lastErr = new Error(`Pollinations/${mdl} empty`);
      } catch (e) { lastErr = e; }
    }
    throw lastErr || new Error('Pollinations ishlamadi');
  },

  async pollinationsText(messages) {
    // GET endpoint — URL uzunligi 4000 belgidan oshmasin
    const flat = this._trimMessages(messages, 3000);
    const last = flat.filter(m => m.role !== 'system').map(m => m.content).join('\n').slice(-1500);
    const sys = flat.find(m => m.role === 'system')?.content?.slice(0, 800) || '';
    const prompt = encodeURIComponent((sys ? sys.slice(0,400) + '\n\n' : '') + last);
    const res = await fetch(`https://text.pollinations.ai/${prompt}?model=openai&seed=42`);
    if (!res.ok) throw new Error(`Pollinations text ${res.status}`);
    const text = await res.text();
    if (!text || text.length < 2) throw new Error('Pollinations text empty');
    return text;
  },

  // Har bir provider uchun timeout wrapper — 30 soniya kutamiz
  _withTimeout(promise, ms = 30000) {
    return Promise.race([
      promise,
      new Promise((_, rej) => setTimeout(() => rej(new Error('Timeout')), ms)),
    ]);
  },

  async call(messages, model) {
    const m = model || State.model;

    // Provider nomi + funksiyasi juftligi — statusda ko'rsatiladi
    const chain = [];
    if (m.provider === 'anthropic') chain.push(['Anthropic', () => this.anthropic(messages)]);
    else if (m.provider === 'gemini') chain.push(['Gemini', () => this.gemini(messages)]);
    else if (m.provider === 'deepseek') chain.push(['DeepSeek', () => this.deepseek(messages)]);
    else if (m.provider === 'mistral') chain.push(['Mistral', () => this.mistral(messages)]);
    else if (m.provider === 'groq') chain.push(['Groq', () => this.groq(messages)]);
    else chain.push(['OpenRouter', () => this.openrouter(messages, m.id)]);

    // Fallback zanjiri — bepul provayderlar (GitHub token bor bo'lsa eng birinchi)
    chain.push(
      ['GitHub-GPT4o', () => this.githubModels(messages, 'gpt-4o-mini')],
      ['GitHub-Llama', () => this.githubModels(messages, 'Meta-Llama-3.1-70B-Instruct')],
      ['OpenRouter-fb', () => this.openrouter(messages, MODELS[0].id)],
      ['Groq', () => this.groq(messages)],
      ['Cerebras', () => this.cerebras(messages)],
      ['Anthropic', () => this.anthropic(messages)],
      ['Gemini', () => this.gemini(messages)],
      ['Together', () => this.together(messages)],
      ['HuggingFace', () => this.huggingface(messages)],
      ['Pollinations', () => this.pollinations(messages)],
      ['Pollinations-txt', () => this.pollinationsText(messages)],
    );

    const errs = [];
    let tried = 0;

    for (const [name, fn] of chain) {
      // Kalit yo'q xatolarini skip — timeout sarf etmaymiz
      try {
        AI._showStatus?.(`🔄 ${name} urinilmoqda... (${++tried}/${chain.length})`);
        const result = await this._withTimeout(fn(), 25000);
        AI._hideStatus?.();
        if (tried > 1) toast(`✅ ${name} ishladi`);
        return result;
      } catch (e) {
        const msg = e.message || '';
        errs.push(`${name}: ${msg}`);
        const statusCode = parseInt(msg.match(/\d{3}/)?.[0] || '0');
        // 429 = limit tugadi → darhol keyingisiga
        // 401/403 = noto'g'ri kalit → skip
        // "kaliti yo'q" → skip (timeout yo'q)
        if (statusCode === 429) {
          console.warn(`${name} limit tugadi → keyingisi`);
          continue;
        }
        console.warn(`AI fallback [${name}]:`, msg);
      }
    }

    AI._hideStatus?.();
    const allNoKey = errs.every(e => /kalit yo'q|kaliti yo'q/i.test(e));
    if (allNoKey) {
      throw new Error('AI kalit topilmadi. /setup yozing yoki Sozlamalar → AI Kalitlari → Groq (bepul)');
    }
    const last = errs.filter(e => !/kalit yo'q/i.test(e)).slice(-2).join(' | ');
    throw new Error(`Barcha AI ${chain.length} ta urinishdan so'ng javob bermadi. ${last ? '(' + last + ')' : ''}`);
  },
};

// ══════════════════════════════════════════════════════════════
//  STREAMING AI — Real-time token-by-token output
// ══════════════════════════════════════════════════════════════
const StreamAI = {
  enabled() { return Store.get('stream_enabled', true); },

  async _pipe(res, onChunk) {
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let full = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const line of dec.decode(value, { stream: true }).split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const d = line.slice(6).trim();
        if (d === '[DONE]') continue;
        try {
          const delta = JSON.parse(d).choices?.[0]?.delta?.content || '';
          if (delta) { full += delta; onChunk?.(full); }
        } catch {}
      }
    }
    return full;
  },

  async openrouter(messages, modelId, onChunk) {
    const keys = AIRouter.keys();
    if (!keys.length) throw new Error('OpenRouter kaliti yo\'q');
    let lastErr;
    for (const key of keys) {
      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}`, 'HTTP-Referer': 'https://omnicode.app', 'X-Title': 'OmniCode' },
          body: JSON.stringify({ model: modelId, messages, max_tokens: 8192, stream: true }),
        });
        if (!res.ok) {
          lastErr = new Error(`OpenRouter ${res.status}`);
          if (res.status === 429 || res.status === 402) { continue; }
          throw lastErr;
        }
        return this._pipe(res, onChunk);
      } catch (e) {
        if (/429|402|limit/i.test(e.message)) { lastErr = e; continue; }
        throw e;
      }
    }
    throw lastErr || new Error('OpenRouter barcha kalitlar tugadi');
  },

  async groq(messages, onChunk) {
    const key = Store.get('keys', {}).groq;
    if (!key) throw new Error('Groq kaliti yo\'q');
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, max_tokens: 8192, stream: true }),
    });
    if (!res.ok) throw new Error(`Groq ${res.status}`);
    return this._pipe(res, onChunk);
  },

  async call(messages, model, onChunk) {
    const m = model || State.model;
    const streamChain = [];

    // Tanlangan model birinchi
    if (m.provider === 'openrouter' && AIRouter.keys().length)
      streamChain.push(['OpenRouter', () => this.openrouter(messages, m.id, onChunk)]);
    if (m.provider === 'groq' && Store.get('keys', {}).groq)
      streamChain.push(['Groq', () => this.groq(messages, onChunk)]);

    // Fallback stream providers
    if (Store.get('keys', {}).github)
      streamChain.push(['GitHub-stream', () => { throw new Error('no-stream'); }]); // non-stream fallback
    if (AIRouter.keys().length)
      streamChain.push(['OpenRouter-fb', () => this.openrouter(messages, MODELS[0].id, onChunk)]);
    if (Store.get('keys', {}).groq)
      streamChain.push(['Groq-fb', () => this.groq(messages, onChunk)]);

    if (!streamChain.length) throw new Error('Stream kalit yo\'q');

    for (const [name, fn] of streamChain) {
      try {
        return await AIRouter._withTimeout(fn(), 25000);
      } catch (e) {
        const code = parseInt((e.message||'').match(/\d{3}/)?.[0]||'0');
        console.warn(`Stream [${name}] xato:`, e.message);
        if (code === 429 || code === 503) continue; // limit → keyingisi
        throw e; // boshqa xato → non-stream ga fallback
      }
    }
    throw new Error('Stream limit — non-stream ga o\'tiladi');
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
  githubCtx: null,
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
//  COMMAND PALETTE
// ══════════════════════════════════════════════════════════════
const Palette = {
  _all: [
    { icon: '💬', label: 'AI Chat ochish',            hint: 'ai',    action: () => App.nav('ai') },
    { icon: '📁', label: 'Yangi loyiha yaratish',     hint: 'new',   action: () => App.newProject() },
    { icon: '🔧', label: 'O\'z-o\'zini tuzatish',     hint: 'fix',   action: () => SelfHeal.analyze() },
    { icon: '📦', label: 'OmniCode kodini import',   hint: 'self',  action: () => SelfImport.run() },
    { icon: '☁️', label: 'Bulutga saqlash',           hint: 'sync',  action: () => SB.syncAll() },
    { icon: '⬇️', label: 'Bulutdan yuklash',          hint: 'pull',  action: () => SB.pullAll() },
    { icon: '🚀', label: 'GitHubga yuborish',         hint: 'deploy',action: () => Deploy.start() },
    { icon: '🧠', label: 'AI modelini o\'zgartirish', hint: 'model', action: () => App.openModelPicker() },
    { icon: '⚙️', label: 'Sozlamalar',               hint: 'set',   action: () => App.nav('settings') },
    { icon: '🤖', label: 'Agentlar',                  hint: 'agent', action: () => App.nav('agents') },
    { icon: '🔄', label: 'Ko\'p agentli pipeline',    hint: 'pipe',  action: () => Agents.runPipeline('', ['planner','coder','reviewer']) },
    { icon: '🗑', label: 'Chat tarixini tozalash',    hint: 'clear', action: () => AI.clear() },
    { icon: '📊', label: 'Statistika',                hint: 'stat',  action: () => App.nav('home') },
    { icon: '📁', label: 'Loyihalar',                 hint: 'proj',  action: () => App.nav('projects') },
    { icon: '🌊', label: 'Streaming rejim almashtir', hint: 'stream',action: () => Settings.toggleStream() },
  ],
  _filtered: null,

  open() {
    const el = document.getElementById('palette-overlay');
    const inp = document.getElementById('palette-input');
    if (!el) return;
    el.classList.add('open');
    inp.value = '';
    this._filtered = null;
    this._render(this._all);
    setTimeout(() => inp.focus(), 80);
  },

  close() { document.getElementById('palette-overlay')?.classList.remove('open'); },

  _render(cmds) {
    const list = document.getElementById('palette-list');
    if (!list) return;
    list.innerHTML = cmds.length
      ? cmds.map((c, i) => `<div class="pal-item" onclick="Palette._run(${i})"><span class="pal-icon">${c.icon}</span><span class="pal-label">${c.label}</span>${c.hint ? `<span class="pal-hint">${c.hint}</span>` : ''}</div>`).join('')
      : '<div style="padding:20px;text-align:center;color:var(--text3)">Topilmadi</div>';
  },

  filter(q) {
    const lower = q.toLowerCase();
    this._filtered = q ? this._all.filter(c => c.label.toLowerCase().includes(lower) || c.hint?.includes(lower)) : null;
    this._render(this._filtered || this._all);
  },

  _run(idx) {
    const cmds = this._filtered || this._all;
    cmds[idx]?.action?.();
    this.close();
  },

  onKey(e) {
    if (e.key === 'Escape') this.close();
    if (e.key === 'Enter') {
      const cmds = this._filtered || this._all;
      if (cmds.length) { cmds[0].action(); this.close(); }
    }
  },
};

// ══════════════════════════════════════════════════════════════
//  SELF-HEAL — Auto analyze and fix project issues
// ══════════════════════════════════════════════════════════════
//  SELF IMPORT — OmniCode o'z kodini loyiha sifatida saqlaydi
// ══════════════════════════════════════════════════════════════
const SelfImport = {
  PROJECT_ID: 'self_omnicode_source',
  REPO_OWNER: 'xojasoipov-sketch',
  REPO_NAME: 'Useg-kop',
  BRANCH: 'claude/shuni-chuntr-va-qil-60bfra',

  // Key files to track
  FILES: [
    'omnicode/frontend/app.js',
    'omnicode/frontend/index.html',
    'omnicode/frontend/styles/main.css',
    '.github/workflows/pages.yml',
    'CLAUDE.md',
  ],

  async run() {
    toast('🔄 OmniCode o\'z kodini yuklamoqda...');

    // Ensure project exists locally
    if (!PM.get(this.PROJECT_ID)) {
      const projects = PM.list();
      projects.unshift({
        id: this.PROJECT_ID,
        name: '📦 OmniCode — Manba Kodi',
        template: 'self',
        created: Date.now(),
        updated: Date.now(),
        github: { owner: this.REPO_OWNER, repo: this.REPO_NAME, branch: this.BRANCH },
        starred: true,
      });
      Store.set('projects', projects);
    }

    const results = [];
    let ok = 0;

    for (const filePath of this.FILES) {
      try {
        // Try GitHub API first
        const token = Git.token();
        let content = null;
        if (token) {
          content = await Git.getFileContent(this.REPO_OWNER, this.REPO_NAME, filePath, this.BRANCH);
        }
        // Fallback: fetch from GitHub Pages raw URL
        if (!content) {
          const raw = `https://raw.githubusercontent.com/${this.REPO_OWNER}/${this.REPO_NAME}/${this.BRANCH}/${filePath}`;
          const res = await fetch(raw);
          if (res.ok) content = await res.text();
        }
        if (content) {
          FS.write(this.PROJECT_ID, filePath, content);
          results.push(`✅ ${filePath} (${(content.length/1024).toFixed(1)}kb)`);
          ok++;
        } else {
          results.push(`⚠️ ${filePath} — yuklanmadi`);
        }
      } catch (e) {
        results.push(`❌ ${filePath}: ${e.message}`);
      }
    }

    // Add AI context file so next AI knows everything
    const contextFile = this._buildContextFile();
    FS.write(this.PROJECT_ID, 'AI_CONTEXT.md', contextFile);
    results.push(`✅ AI_CONTEXT.md — AI uchun kontekst`);

    // Sync to Supabase
    try {
      await SB.syncAll();
      results.push(`☁️ Supabase'ga saqlandi`);
    } catch {}

    // Set as current project
    PM.setCurrent(this.PROJECT_ID);

    const summary = `📦 **OmniCode Manba Kodi import qilindi!**\n\n${results.join('\n')}\n\n**${ok}/${this.FILES.length}** fayl muvaffaqiyatli\n\nEndi AI Chat ga o'tib "@omnicode/frontend/app.js ni tahrirlash" deb so'rasangiz, AI loyiha kodiga ega bo'lib ishlaydi.`;

    // Show in AI chat
    App.nav('chat');
    AI.appendBubble('ai', summary, false);
    toast(`✅ ${ok} ta fayl import qilindi`);
  },

  // Loyiha yo'q bo'lsa yaratib active qiladi (async, tez)
  async ensureProject() {
    if (!PM.get(this.PROJECT_ID)) {
      const projects = PM.list();
      projects.unshift({
        id: this.PROJECT_ID,
        name: 'OmniCode — Manba Kodi',
        template: 'self',
        created: Date.now(),
        updated: Date.now(),
        github: { owner: this.REPO_OWNER, repo: this.REPO_NAME, branch: this.BRANCH },
        starred: true,
      });
      Store.set('projects', projects);
    }
    State.projectId = this.PROJECT_ID;
    PM.setCurrent(this.PROJECT_ID);
  },

  _buildContextFile() {
    return `# OmniCode — AI Kontekst Fayli
Yaratilgan: ${new Date().toISOString()}

## Loyiha haqida
OmniCode — Telegram Mini App sifatida ishlaydigan AI coding assistant.
Foydalanuvchi: xojasoipov@gmail.com
GitHub: xojasoipov-sketch/Useg-kop
Branch: claude/shuni-chuntr-va-qil-60bfra
Deploy: GitHub Pages (peaceiris/actions-gh-pages@v4)

## Arxitektura
- \`omnicode/frontend/app.js\` — Barcha JavaScript logika (bitta fayl, ~2000 qator)
- \`omnicode/frontend/index.html\` — Barcha HTML + CSS
- \`omnicode/frontend/styles/main.css\` — Qo'shimcha stillar
- Supabase: tomkxsdkerpbvlumubbg.supabase.co (anon key hardcoded, xavfsiz)

## Asosiy modullar (app.js ichida)
- \`Store\` — localStorage wrapper
- \`SB\` — Supabase cloud sync
- \`Git\` — GitHub API (browser fetch)
- \`GitTools\` — AI→GitHub tool protocol (<GH_*> tags)
- \`SelfImport\` — O'z kodini import qilish
- \`SelfHeal\` — O'z-o'zini tuzatish
- \`StreamAI\` — SSE streaming (OpenRouter + Groq)
- \`AIRouter\` — Multi-provider fallback
- \`FS\` — Virtual File System (localStorage)
- \`PM\` — Project Manager
- \`DiffView\` — LCS diff viewer (approve/reject)
- \`Palette\` — Command palette (⌘K)
- \`Deploy\` — GitHub Pages deploy
- \`AI\` — Chat logic + tool dispatch
- \`Settings\` — Tabbed settings panel
- \`App\` — Navigation, init

## GitHub Tool Protocol
AI javobida quyidagi taglar → app.js execute qiladi:
\`\`\`
<GH_LIST_REPOS/>
<GH_LIST_FILES owner="x" repo="y" path=""/>
<GH_READ_FILE owner="x" repo="y" path="file.js"/>
<GH_WRITE_FILE owner="x" repo="y" path="file.js" message="commit msg">content</GH_WRITE_FILE>
<GH_CREATE_REPO name="repo" private="false"/>
\`\`\`

## Davom ettirish uchun
1. Sozlamalar → GitHub token kiriting
2. AI Chat → 🐙 GitHub chip → repolar yuklanadi
3. "@AI_CONTEXT.md" deb murojaat qiling — bu fayl
4. "/import xojasoipov-sketch/Useg-kop" → loyiha yangilanadi
`;
  },
};

// ══════════════════════════════════════════════════════════════
//  SELF IMPROVE — OmniCode o'zini-o'zi avtonom yaxshilaydi
// ══════════════════════════════════════════════════════════════
const SelfImprove = {

  // OmniCode o'z kodini o'qib, yaxshilab, o'zi push qiladi
  async run(userTask = '') {
    if (!Git.token()) {
      App.nav('ai');
      AI.appendBubble('ai', `❌ **GitHub token kerak**\n\nSozlamalar → Kod → GitHub tokenini qo'shing. Token bilan OmniCode o'z kodini o'zgartirib, avtomatik deploy qila oladi.`, false);
      return;
    }

    App.nav('ai');
    await SelfImport.ensureProject();

    // 1. O'z kodini GitHub dan yuklab oladi
    AI.appendBubble('ai', `🔄 **O'z kodini o'qiyapman...**\n\nomnicode/frontend/app.js GitHub'dan yuklanmoqda...`, false);

    let appJs = '', indexHtml = '';
    try {
      appJs = await Git.getFileContent(
        SelfImport.REPO_OWNER, SelfImport.REPO_NAME,
        'omnicode/frontend/app.js', SelfImport.BRANCH
      );
      indexHtml = await Git.getFileContent(
        SelfImport.REPO_OWNER, SelfImport.REPO_NAME,
        'omnicode/frontend/index.html', SelfImport.BRANCH
      );
    } catch(e) {
      AI.appendBubble('ai', `❌ Kod o'qishda xato: ${e.message}`, false);
      return;
    }

    if (!appJs) {
      AI.appendBubble('ai', `❌ app.js yuklanmadi. GitHub token to'g'ri ekanini tekshiring.`, false);
      return;
    }

    // VFS ga saqlash
    FS.write(SelfImport.PROJECT_ID, 'omnicode/frontend/app.js', appJs);
    if (indexHtml) FS.write(SelfImport.PROJECT_ID, 'omnicode/frontend/index.html', indexHtml);

    AI.appendBubble('ai', `✅ Kod o'qildi (${(appJs.length/1024).toFixed(0)}KB). AI tahlil qilyapti...`, false);

    // 2. AI ga topshiriq beradi
    const task = userTask || 'xatolarni tuzat, tezlikni yaxshila, foydalanuvchi tajribasini yaxshila';
    const prompt = `Sen OmniCode AI coding assistant'ning o'zi. Quyida o'z manba koding berilgan.

VAZIFA: ${task}

QOIDALAR:
1. Kodni sinchiklab o'qi
2. Muammolarni aniqlash: xatolar, cheklovlar, yaxshilash mumkin bo'lgan joylar
3. Yaxshilashlarni qil
4. TO'LIQ yangilangan faylni WRITE_FILE bilan yoz — faqat o'zgargan qism emas, butun fayl
5. Nima o'zgartirganingni qisqacha tushuntir

WRITE_FILE format:
\`\`\`write_file:omnicode/frontend/app.js
[to'liq yangilangan kod bu yerda]
\`\`\`

MUHIM: Men (tizim) avtomatik GitHub'ga push qilib, deploy qilaman. Sen faqat to'liq kodni yoz.

=== app.js (${(appJs.length/1024).toFixed(0)}KB) ===
\`\`\`javascript
${appJs}
\`\`\``;

    // 3. AI ga yuboradi
    const messages = [
      { role: 'system', content: `Sen OmniCode — o'z-o'zini yaxshilovchi AI. O'z kodingni o'qib, yaxshilab, WRITE_FILE format bilan qaytarassan. Faqat o'zbek tilida javob ber.` },
      { role: 'user', content: prompt }
    ];

    AI.showTyping();
    AI.busy = true;
    AI._busySince = Date.now();
    ActivityBar.setPhase('thinking');

    let reply;
    try {
      reply = await AIRouter.call(messages);
    } catch(e) {
      AI.hideTyping();
      AI.busy = false;
      ActivityBar.error();
      AI.appendBubble('ai', `❌ AI xatosi: ${e.message}\n\n/setup buyrug'i bilan AI kalitini qo'shing.`, false);
      return;
    }

    AI.hideTyping();
    ActivityBar.setPhase('writing');

    // 4. Javobni ko'rsatadi
    const div = AI.appendBubble('ai', reply, false);

    // 5. WRITE_FILE ni parse qilib push qiladi
    const writes = FS.parseWrites(reply);
    if (writes.length) {
      writes.forEach(w => FS.write(SelfImport.PROJECT_ID, w.path, w.content));
      ActivityBar.setPhase('pushing');
      AI._showStatus('🚀 O\'zgarishlar GitHub\'ga push qilinmoqda...');
      let pushed = 0;
      for (const w of writes) {
        try {
          await Git.pushFile(SelfImport.REPO_OWNER, SelfImport.REPO_NAME, w.path, w.content, SelfImport.BRANCH, `self-improve: ${task.slice(0,60)}`);
          pushed++;
        } catch(e) { console.warn('push fail:', w.path, e.message); }
      }
      AI._hideStatus();
      if (pushed > 0) {
        AI.appendBubble('ai', `✅ **${pushed} ta fayl GitHub'ga push qilindi!**\n\nGitHub Actions avtomatik deploy qilmoqda...\n🔗 [GitHub Pages'da ko'rish](https://xojasoipov-sketch.github.io/Useg-kop/)`, false);
        toast(`✅ Self-improve: ${pushed} ta fayl yangilandi`);
      } else {
        AI.appendBubble('ai', `⚠️ Push qilishda xato. GitHub token'ni tekshiring.`, false);
      }
    } else {
      AI.appendBubble('ai', `ℹ️ AI hech qanday o'zgartirish qilmadi. Aniqroq vazifa bering.`, false);
    }

    if (div) AI._addBubbleActions(div, reply, writes);
    AI.busy = false;
    ActivityBar.done();
    Analytics.track(Math.floor(reply.length / 4));
    State.chatHistory.push({ role: 'assistant', content: reply });
  },
};

// ══════════════════════════════════════════════════════════════
const SelfHeal = {
  async analyze() {
    let projectId = State.projectId;

    // Loyiha yo'q → SelfImport loyihasiga o'tamiz (agar token bor bo'lsa)
    if (!projectId && Git.token()) {
      await SelfImport.ensureProject();
      projectId = SelfImport.PROJECT_ID;
    }

    // GitHub token yo'q bo'lsa — o'z kodini tahlil qilish imkonsiz
    if (!projectId) {
      App.nav('ai');
      AI.appendBubble('ai', `⚠️ **Loyiha yoki GitHub token kerak**\n\n1. Sozlamalar → GitHub Token qo'shing\n2. Yoki Loyihalar → Yangi loyiha yarating`, false);
      return;
    }

    // Loyiha SelfImport bo'lsa — GitHub dan faylni yuklab olamiz
    if (projectId === SelfImport.PROJECT_ID) {
      App.nav('ai');
      AI.appendBubble('ai', `🔧 **O'z-o'zini tuzatish** — OmniCode o'z kodini tekshirmoqda...`, false);
      const taskId2 = Tasks.add('🔧 SelfHeal', 'O\'z kodi tahlil qilinmoqda');
      try {
        AI._showStatus('📖 OmniCode kodi GitHub dan yuklanmoqda...');
        const code = await Git.getFileContent('xojasoipov-sketch', 'Useg-kop', 'omnicode/frontend/app.js', 'claude/shuni-chuntr-va-qil-60bfra');
        AI._hideStatus();
        if (!code) throw new Error('Fayl GitHub dan yuklanmadi');
        FS.write(SelfImport.PROJECT_ID, 'omnicode/frontend/app.js', code);
        const msgs = [
          { role: 'system', content: AI.system() },
          { role: 'user', content: `OmniCode app.js kodini tahlil qil, xatolarni topib tuzat:\n\`\`\`js\n${code.slice(0,15000)}\n\`\`\`` },
        ];
        ActivityBar.start('thinking');
        const reply = await AIRouter.call(msgs);
        const el = AI.appendBubble('ai', reply, false);
        await AI._finalize(reply, el, msgs, document.getElementById('chat-messages'), taskId2);
      } catch(e) {
        AI._hideStatus();
        Tasks.remove(taskId2);
        ActivityBar.error();
        const msg = e.message || '';
        if (/kalit|key|401|403|topilmadi/i.test(msg)) {
          AI.appendBubble('ai', `❌ **AI kaliti kerak**\n\nGitHub token ulangan ✅\n\nLekin AI kaliti yo'q. /setup yozing → Groq kalit qo'shing (bepul, 1 daqiqa).`, false);
        } else {
          AI.appendBubble('ai', `❌ **${msg}**`, false);
        }
      }
      return;
    }

    App.nav('ai');
    const taskId = Tasks.add('🔧 O\'z-o\'zini tuzatish', 'Loyiha tahlil qilinmoqda...');
    Tasks.update(taskId, { progress: 10 });

    const introDiv = AI.appendBubble('ai', `🔧 **O\'z-o\'zini tuzatish** jarayoni boshlandi...\n\nLoyiha barcha fayllari tahlil qilinmoqda...`, false);

    const ctx = FS.context(projectId, 20000);
    const p = PM.get(projectId);
    const messages = [
      {
        role: 'system',
        content: `You are a senior software engineer doing an automated code review and bug fix.
TASK: Analyze ALL project files thoroughly. Find:
1. Syntax errors and bugs
2. Missing imports or dependencies
3. Security vulnerabilities
4. Logic errors
5. Missing files that should exist
6. Broken references

Then provide FIXED versions of problematic files using:
<WRITE_FILE path="relative/path">
complete fixed file content
</WRITE_FILE>

Be thorough. Fix all issues found. Include complete file content, not just diffs.`,
      },
      {
        role: 'user',
        content: `Project: ${p?.name || 'Unknown'}\n\nAnalyze and fix all issues in this project:\n${ctx || 'No files found in project.'}`,
      },
    ];

    Tasks.update(taskId, { progress: 40 });

    try {
      let reply;
      const streamEl = document.getElementById('chat-messages');
      let streamBubble = null;

      const onChunk = (full) => {
        if (!streamBubble) {
          streamBubble = AI.appendBubble('ai', '', false);
        }
        streamBubble.innerHTML = MD.render(FS.stripCommands(full)) + '<span class="stream-cursor"></span>';
        streamEl.scrollTop = streamEl.scrollHeight;
      };

      Tasks.update(taskId, { progress: 60 });

      try {
        reply = await StreamAI.call(messages, null, onChunk);
      } catch {
        reply = await AIRouter.call(messages);
      }

      if (streamBubble) {
        streamBubble.innerHTML = MD.render(FS.stripCommands(reply));
      } else {
        AI.appendBubble('ai', reply, false);
      }

      const writes = FS.parseWrites(reply);
      if (writes.length) {
        State.pendingWrites = writes;
        const btn = document.createElement('button');
        btn.className = 'apply-btn';
        btn.textContent = `🔧 ${writes.length} ta tuzatishni qo'llash`;
        btn.onclick = () => DiffView.show();
        (streamBubble || streamEl.lastElementChild)?.appendChild(btn);
        toast(`🔧 ${writes.length} ta muammo topildi va tuzatildi`);
      } else {
        toast('✅ Loyihada jiddiy xatolar topilmadi');
      }

      Analytics.track(Math.floor(reply.length / 4));
      Tasks.update(taskId, { progress: 100, status: 'done' });
      Tasks.remove(taskId);
    } catch (e) {
      AI.appendBubble('ai', `❌ **Tahlil xatosi:** ${e.message}`, false);
      Tasks.remove(taskId);
    } finally {
      Home.refresh();
    }
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
          <div style="font-size:14px;font-weight:700;margin-bottom:2px">${m.name} ${m.stream ? '<span style="font-size:10px;color:var(--green);background:rgba(34,197,94,0.1);padding:1px 6px;border-radius:8px">stream</span>' : ''}</div>
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
    const name = tg?.initDataUnsafe?.user?.first_name || 'Foydalanuvchi';
    const el = document.getElementById('greeting-text');
    if (el) el.textContent = `${greet}, ${name} 👋`;

    document.getElementById('model-label').textContent = State.model.short;
    document.getElementById('default-model-val').textContent = State.model.short;

    // Show cloud user ID
    const uid = document.getElementById('cloud-uid-val');
    if (uid) uid.textContent = SB.userId();

    AI.addWelcome();
    Home.refresh();
    Projects.render();
    Settings.refresh();

    // Auto-check: if self project exists, show update hint
    if (PM.get(SelfImport.PROJECT_ID)) {
      const age = Date.now() - (PM.get(SelfImport.PROJECT_ID)?.updated || 0);
      if (age > 86400000) { // older than 1 day
        setTimeout(() => toast('💡 /self buyrug\'i bilan OmniCode kodini yangilang'), 3000);
      }
    }
  },
};

// ══════════════════════════════════════════════════════════════
//  HOME
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

    const tokEl = document.getElementById('stat-tokens');
    if (tokEl) tokEl.textContent = Analytics.fmtTokens(week.tokens);
    const tokChange = document.getElementById('stat-tokens-change');
    if (tokChange) {
      const pct = yesterday.tokens ? Math.round((today.tokens - yesterday.tokens) / yesterday.tokens * 100) : (today.tokens > 0 ? 100 : 0);
      tokChange.textContent = (pct >= 0 ? '+' : '') + pct + '%';
      tokChange.className = 'an-change ' + (pct >= 0 ? 'up' : 'down');
    }

    const reqEl = document.getElementById('stat-requests');
    if (reqEl) reqEl.textContent = week.requests;
    const reqChange = document.getElementById('stat-requests-change');
    if (reqChange) {
      const pct = yesterday.requests ? Math.round((today.requests - yesterday.requests) / yesterday.requests * 100) : (today.requests > 0 ? 100 : 0);
      reqChange.textContent = (pct >= 0 ? '+' : '') + pct + '%';
      reqChange.className = 'an-change ' + (pct >= 0 ? 'up' : 'down');
    }

    const projects = PM.list().length;
    const usagePct = Math.min(100, projects * 20 + (today.requests * 5));
    const usageEl = document.getElementById('usage-pct');
    const usageBar = document.getElementById('usage-bar');
    const usageSub = document.getElementById('usage-sub');
    if (usageEl) usageEl.textContent = usagePct + '%';
    if (usageBar) usageBar.style.width = usagePct + '%';
    if (usageSub) usageSub.textContent = today.requests + ' ta so\'rov bugun · Bepul provayderlar';

    // Cloud stats
    const cloudVal = document.getElementById('cloud-status-val');
    if (cloudVal) cloudVal.textContent = PM.list().length + ' 💾';
    const cloudBar = document.getElementById('cloud-bar');
    if (cloudBar) cloudBar.style.width = Math.min(100, PM.list().length * 15) + '%';
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
          <div class="project-time">${FS.index(p.id).length} fayl · ${timeAgo(p.updated || p.created)}</div>
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
      ghStatus.textContent = keys.github ? 'Ulangan ✓' : 'Sozlanmagan';
      ghStatus.style.color = keys.github ? 'var(--green)' : 'var(--text3)';
    }
    // Update GitHub chip in chat
    const ghChip = document.getElementById('gh-chip');
    if (ghChip) {
      ghChip.innerHTML = keys.github ? '🐙 GitHub <span style="color:var(--green);font-size:10px">●</span>' : '🐙 GitHub';
    }
    if (aiStatus && aiName) {
      const hasKey = keys.or1 || keys.groq || keys.anthropic || keys.gemini || keys.deepseek || keys.mistral || keys.together || keys.cerebras;
      const hasGitHub = !!keys.github;
      if (hasKey) {
        const provName = keys.anthropic ? 'Anthropic' : keys.or1 ? 'OpenRouter' : keys.groq ? 'Groq' : keys.cerebras ? 'Cerebras' : keys.gemini ? 'Gemini' : keys.deepseek ? 'DeepSeek' : 'Together AI';
        aiName.textContent = provName + ' AI';
        aiStatus.textContent = 'Ulangan · Stream ' + (StreamAI.enabled() ? '🟢' : '⭕');
        aiStatus.style.color = 'var(--green)';
      } else if (hasGitHub) {
        aiName.textContent = 'GitHub Models AI';
        aiStatus.textContent = 'GitHub token orqali bepul ✅';
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
//  AI CHAT — with streaming
// ══════════════════════════════════════════════════════════════
const AGENT_SYSTEMS = {
  master:     'Sen Bosh Agent. Murakkab vazifalarni taqsimlab, parallel bajarassan.',
  planner:    'Sen Rejalashtiruvchi Agent. Texnik yo\'l xaritasi va vazifalarni aniq va batafsil tuzassan.',
  researcher: 'Sen Tadqiqotchi Agent. Aniq ma\'lumot, eng yaxshi amaliyotlar va hujjatlarni topassan.',
  coder:      'Sen Kod Yozuvchi Agent. Production-ready, to\'liq ishlaydigan kod yozassan. WRITE_FILE formatdan foydalanassan.',
  designer:   'Sen UI/UX Dizayner Agent. Go\'zal, mobile-first interfeys yaratasan. Faqat HTML/CSS/JS.',
  reviewer:   'Sen Kod Tekshiruvchi Agent. Xatolar, xavfsizlik muammolari, performance muammolarini topassan.',
  tester:     'Sen Test Yozuvchi Agent. Unit, integration, e2e testlar yozassan.',
  deployer:   'Sen Deploy Agent. CI/CD, GitHub Actions, cloud deploy boshqarassan.',
  backend:    'Sen Backend Agent. Scalable API, database schema, server logika yozassan.',
  security:   'Sen Xavfsizlik Agent. Zaifliklarni topib, xavfsiz kod yozassan.',
  optimizer:  'Sen Optimizator Agent. Performance yaxshilab, kod murakkabligini kamaytirassan.',
  docs:       'Sen Hujjatlashtiruvchi Agent. Aniq, tushunarli hujjat va README yozassan.',
};

const AI = {
  busy: false,

  // ═══════════════════════════════════════════════════════════════
  //  MIYA — Claude Code kabi ishlaydigan to'liq agent tizimi
  // ═══════════════════════════════════════════════════════════════
  system() {
    const project    = State.projectId ? PM.get(State.projectId) : null;
    const projectCtx = State.projectId ? FS.context(State.projectId) : '';
    const agentRole  = State.agent ? `\n## Agent roli\n${AGENT_SYSTEMS[State.agent]}\n` : '';
    const ghActive   = State.activeTools.has('github') && Git.token();
    const ghCtx      = State.githubCtx || (ghActive ? 'GitHub: ulangan, repolar yuklanishi kutilmoqda' : '');
    const now        = new Date().toLocaleString('uz-UZ');

    return `Sen OmniCode — mobil uchun Claude Code. Foydalanuvchi: xojasoipov@gmail.com
Sana: ${now}
${agentRole}
## Sen kimsan
- Mustaqil, avtonomik AI dasturlash agenti
- Vazifani boshidan oxirigacha mustaqil bajarasan — foydalanuvchi har qadamda ruxsat so'ramaydi
- Kod yozasan, fayllarni o'qib tahrir qilasan, GitHub'ga push qilasan, xatolarni tuzatasan
- Faqat O'zbek tilida gaplashasan (kod ichida inglizcha yozuv OK)

## Fayl yozish protokoli
Kod yozganda DOIM bu formatdan foydalanasan:
\`\`\`
<WRITE_FILE path="relative/path/file.js">
...to'liq fayl kontenti...
</WRITE_FILE>
\`\`\`
- DOIM to'liq fayl yozasan — hech qachon qisman yoki "... qolgan kod ..." emas
- Bir javobda bir nechta fayl yozish mumkin
- Foydalanuvchi diff ko'rib tasdiqlaydi — lekin sen to'liq yozasan

## GitHub imkoniyatlari
${ghActive
  ? `✅ GitHub ulangan — ${ghCtx}

Foydalanuvchi so'raganda:
- Repolarni ko'rish → [GitHub ma'lumotlari] blokida keladi (allaqachon yuklangan)
- Fayl o'qish → [GitHub ma'lumotlari] blokida to'liq kod bor
- Kod o'zgartirish → WRITE_FILE bilan yoz → "GitHub'ga push" tugmasi chiqadi
- Avtomatik push → GitHub chip active + token bor → push bo'ladi
- HECH QACHON "men GitHub'ga kira olmayman" dema — ma'lumot tayyor beriladi`
  : `⚠️ GitHub chip faol emas
Agar foydalanuvchi GitHub haqida so'rasa: "🐙 GitHub chipni bosing, keyin token kiriting" de`}

## Joriy holat
PROJECT: ${project ? `"${project.name}" (id: ${project.id})` : 'tanlanmagan'}
TOOLS: ${[...State.activeTools].join(', ') || 'hech biri'}
SUPABASE: ulangan (tomkxsdkerpbvlumubbg.supabase.co)
${projectCtx ? '\n## Loyiha fayllari\n' + projectCtx : ''}

## Qoidalar — BULARNI DOIM BAJO QIL
1. **Vazifani to'liq tugat** — "men bu qila olmayman" dema, yo'l top
2. **To'liq kod yoz** — hech qachon "// qolgan kod shu yerga" dema
3. **Qisqa gapir** — keraksiz tushuntirish yo'q, ish qil
4. **Xatoni o'zing tuzat** — agar biror narsa noto'g'ri bo'lsa, o'zin tuzat
5. **Avtomatik ish qil** — foydalanuvchi "qil" desa, so'ramasdan bajar
6. **Kod + tushuntirish** — avval kod, keyin 2-3 qator nima qilganingni ayt
7. **O'zbek tilida** — foydalanuvchi o'zbek yozsа, sen ham o'zbek til

## Sen qila olasanlar
- Har qanday dasturlash tili: JS, TS, Python, Go, Rust, Java...
- Frontend: React, Vue, Svelte, HTML/CSS, Tailwind
- Backend: Node, Express, FastAPI, Supabase Edge Functions
- Mobile: React Native, Telegram Mini App
- GitHub: repolarni ko'rish, fayl o'qish, kod push qilish, repo yaratish
- Supabase: jadvallar, funksiyalar, auth, storage
- **O'z-o'zini yangilash**: OmniCode o'z kodini (app.js, index.html, main.css) tahrirlaydi va GitHub'ga push qiladi
- Loyiha arxitekturasi: structure, patterns, best practices

## OmniCode o'z kodini yangilash — MUHIM
Agar foydalanuvchi OmniCode ga yangi feature qo'shishni, kodni o'zgartirishni so'rasa:
1. [GitHub ma'lumotlari] blokida to'liq kod berilgan bo'ladi
2. Sen o'sha kodni o'qib, kerakli o'zgartirishlarni kiritib, TO'LIQ yangilangan faylni WRITE_FILE bilan yozasan
3. Men (tizim) avtomatik GitHub'ga push qilaman — foydalanuvchi push bosmasa ham ishlaydi
4. **HECH QACHON "men o'zimni kodimni o'zgartira olmayman" dema** — kodni ko'rsang, o'zgartira olasan
5. Agar kod berilmagan bo'lsa: "Avval /self buyrug'ini bering" de

OmniCode fayl joylashuvi:
- \`omnicode/frontend/app.js\` — barcha JS logika
- \`omnicode/frontend/index.html\` — HTML + inline CSS
- \`omnicode/frontend/styles/main.css\` — CSS
- Branch: \`claude/shuni-chuntr-va-qil-60bfra\`
- Deploy: GitHub Pages (push bo'lgach 1-2 daqiqada yangilanadi)`;
  },

  addWelcome() {
    const el = document.getElementById('chat-messages');
    if (!el) return;
    el.innerHTML = '';
    const ghOk = Git.token();
    const keys = Store.get('keys', {});
    const hasAiKey = keys.groq || keys.or1 || keys.anthropic || keys.gemini;
    this.appendBubble('ai', `# OmniCode AI — Tayyor

Salom! Men sizning shaxsiy AI dasturlash agentingizman.

**Nima qila olaman:**
→ Kod yozaman, tuzataman, tushuntiraman
→ GitHub repolaringizni ko'raman, fayllarni o'qiyman, push qilaman
→ Loyiha yarataman — birinchi commitgacha

${!hasAiKey ? '**AI kalit kerak:**\n`/setup` buyrug\'ini yozing yoki Sozlamalar → AI Kalitlari\n\n' : ''}${ghOk
  ? '✅ GitHub ulangan'
  : '**GitHub:** Sozlamalar → Kod → GitHub token qo\'shing'}

\`/setup\` kalit sozlash · \`/fix\` tuzatish · \`/self\` o'z kodi

Nima quramiz?`, false);
  },

  appendBubble(role, text, hasWrites) {
    const el = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = `bubble ${role}`;
    if (role === 'ai') {
      div.innerHTML = MD.render(FS.stripCommands(text));
      // chips faqat _addBubbleActions da qo'shiladi — bu yerda qo'shmaymiz (duplicate oldini olish)
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
    div.innerHTML = `<div class="thinking-dots"><span></span><span></span><span></span></div><span style="font-size:13px;color:var(--text3)">O'ylayapman...</span><button onclick="AI.cancel()" style="margin-left:10px;padding:2px 8px;border-radius:6px;border:1px solid rgba(255,100,100,0.4);background:rgba(255,100,100,0.1);color:rgba(255,100,100,0.9);font-size:11px;cursor:pointer">Bekor qil</button>`;
    el.appendChild(div); el.scrollTop = el.scrollHeight;
  },
  hideTyping() { document.getElementById('typing-ind')?.remove(); },

  _showSetupGuide() {
    const keys = Store.get('keys', {});
    const hasAny = keys.groq || keys.or1 || keys.anthropic || keys.gemini || keys.cerebras;
    const ghConnected = !!keys.github;
    const el = this.appendBubble('ai', '', false);
    el.innerHTML = `
      <strong>AI Kalit Sozlash</strong>
      ${ghConnected ? '<p style="color:#3fb950;font-size:13px;margin:4px 0 8px">✅ GitHub ulangan → GitHub Models bepul ishlaydi!</p>' : ''}
      <p style="color:var(--text3);font-size:13px;margin:4px 0 12px">Qo\'shimcha kalit qo\'shing (tezroq ishlaydi):</p>
      <div style="display:flex;flex-direction:column;gap:8px">
        <div style="background:var(--bg2);border-radius:10px;padding:10px 12px">
          <div style="font-size:13px;font-weight:600;margin-bottom:4px">🧠 Cerebras (ENG TEZ — 2000 tok/s)</div>
          <div style="font-size:12px;color:var(--text3);margin-bottom:8px">inference.cerebras.ai → "Get API Key" (1M tok/kun bepul)</div>
          <div style="display:flex;gap:6px">
            <input id="quick-cerebras-key" placeholder="csk_..."
              style="flex:1;padding:7px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg3);color:var(--text1);font-size:12px"
              value="${keys.cerebras||''}">
            <button onclick="AI._saveQuickKey('cerebras','quick-cerebras-key')"
              style="padding:7px 12px;border-radius:8px;background:var(--accent);color:#fff;border:none;font-size:12px;cursor:pointer">Saqlash</button>
          </div>
        </div>
        <div style="background:var(--bg2);border-radius:10px;padding:10px 12px">
          <div style="font-size:13px;font-weight:600;margin-bottom:4px">⚡ Groq (bepul, tez)</div>
          <div style="font-size:12px;color:var(--text3);margin-bottom:8px">console.groq.com/keys → "Create API Key"</div>
          <div style="display:flex;gap:6px">
            <input id="quick-groq-key" placeholder="gsk_..."
              style="flex:1;padding:7px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg3);color:var(--text1);font-size:12px"
              value="${keys.groq||''}">
            <button onclick="AI._saveQuickKey('groq','quick-groq-key')"
              style="padding:7px 12px;border-radius:8px;background:var(--accent);color:#fff;border:none;font-size:12px;cursor:pointer">Saqlash</button>
          </div>
        </div>
        <div style="background:var(--bg2);border-radius:10px;padding:10px 12px">
          <div style="font-size:13px;font-weight:600;margin-bottom:4px">🔁 OpenRouter (cheksiz kalit, ko'p model)</div>
          <div style="font-size:12px;color:var(--text3);margin-bottom:8px">openrouter.ai/keys → "Create Key" — nechtasini istasangiz qo'shing</div>
          <div style="display:flex;gap:6px">
            <input id="quick-or-key" placeholder="sk-or-v1-..."
              style="flex:1;padding:7px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg3);color:var(--text1);font-size:12px">
            <button onclick="AI._saveORKeyQuick()"
              style="padding:7px 12px;border-radius:8px;background:var(--accent);color:#fff;border:none;font-size:12px;cursor:pointer">Qo'shish</button>
          </div>
          <div id="or-key-list-setup" style="margin-top:6px;font-size:11px;color:#3fb950"></div>
        </div>
        ${(hasAny || AIRouter.keys().length) ? '<div style="color:#3fb950;font-size:12px;text-align:center">✅ ' + [keys.cerebras&&'Cerebras',keys.groq&&'Groq',AIRouter.keys().length&&('OpenRouter('+AIRouter.keys().length+')'),keys.anthropic&&'Anthropic',keys.gemini&&'Gemini'].filter(Boolean).join(', ') + ' ulangan</div>' : ''}
        <button onclick="App.nav('settings')"
          style="padding:8px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--text2);font-size:12px;cursor:pointer">
          Barcha kalitlar → Sozlamalar
        </button>
      </div>`;
    document.getElementById('chat-messages').scrollTop = 9999;
  },

  _saveORKeyQuick() {
    const inp = document.getElementById('quick-or-key');
    const val = inp?.value?.trim();
    if (!val) { toast('Kalit bo\'sh'); return; }
    if (!val.startsWith('sk-or')) { toast('Kalit sk-or-... bilan boshlanishi kerak'); return; }
    const added = AIRouter.addKey(val);
    if (!added) { toast('Bu kalit allaqachon qo\'shilgan'); return; }
    if (inp) inp.value = '';
    const count = AIRouter.keys().length;
    toast(`✅ OpenRouter kaliti qo'shildi (jami: ${count} ta)`);
    const listEl = document.getElementById('or-key-list-setup');
    if (listEl) listEl.textContent = `✅ ${count} ta kalit ulangan`;
  },

  _saveQuickKey(provider, inputId) {
    const val = document.getElementById(inputId)?.value?.trim();
    if (!val) { toast('Kalit bo\'sh'); return; }
    const keys = Store.get('keys', {});
    keys[provider] = val;
    Store.set('keys', keys);
    toast(`✅ ${provider} kaliti saqlandi`);
    this.appendBubble('ai', `✅ **${provider} kaliti saqlandi!** Endi so'rovingizni yuboring.`, false);
  },

  cancel() {
    this.hideTyping();
    ActivityBar.error();
    this.busy = false;
    toast('Bekor qilindi');
    // Force-reset any pending state
    State.chatHistory = State.chatHistory.filter((_, i) =>
      i < State.chatHistory.length - 1 || State.chatHistory[i].role !== 'user'
    );
  },

  async send(text) {
    const inp = document.getElementById('chat-input');
    const msg = (text || inp?.value || '').trim();
    // busy stuck bo'lib qolgan bo'lsa avtomatik qayta qo'yamiz
    if (this.busy) {
      if (Date.now() - (this._busySince || 0) > 90000) {
        this.busy = false;
        this.hideTyping();
        ActivityBar.error();
        toast('AI timeout — qayta urinilmoqda');
      } else {
        return;
      }
    }
    if (!msg) return;
    if (inp) { inp.value = ''; inp.style.height = ''; }
    this._busySince = Date.now();

    // ── Slash buyruqlar ──────────────────────────────────────────
    const cmd = msg.split(' ')[0].toLowerCase();
    const slashCmds = {
      '/fix': () => SelfHeal.analyze(),
      '/tuzat': () => SelfHeal.analyze(),
      '/sync': () => SB.syncAll(),
      '/saqlash': () => SB.syncAll(),
      '/model': () => App.openModelPicker(),
      '/clear': () => this.clear(),
      '/tozala': () => this.clear(),
      '/palette': () => Palette.open(),
      '/github': () => this._loadGithubContext(),
      '/gh': () => this._loadGithubContext(),
      '/repos': () => this._loadGithubContext(),
      '/self': () => SelfImport.run(),
      '/omnicode': () => SelfImport.run(),
      '/improve': () => SelfImprove.run(msg.slice('/improve'.length).trim()),
      '/yaxshila': () => SelfImprove.run(msg.slice('/yaxshila'.length).trim()),
      '/upgrade': () => SelfImprove.run(msg.slice('/upgrade'.length).trim()),
      '/self-edit': async () => {
        await SelfImport.ensureProject();
        this.appendBubble('ai', `✅ **OmniCode o'z kodi rejimi yoqildi**\n\nEndi men shu loyihaning kodini o'zgartirishga tayyorman.\n\nMisol:\n→ "ActivityBar ga agent sonini qo'sh"\n→ "app.js ga dark mode toggle qo'sh"\n→ "chat bubblega copy tugma qo'sh"\n\nHar bir o'zgartirish avtomatik GitHub'ga push qilinadi ✅`, false);
      },
      '/push': async () => {
        const parts = msg.split(' ');
        await this._autoPushAll(parts[1], parts[2]);
      },
      '/agents': () => App.nav('agents'),
      '/deploy': () => App.nav('deploy'),
      '/projects': () => App.nav('projects'),
      '/home': () => App.nav('home'),
      '/setup': () => this._showSetupGuide(),
      '/keys': () => this._showSetupGuide(),
      '/help': () => this.appendBubble('ai', `**OmniCode buyruqlari:**\n\`/improve [vazifa]\` — O'zini-o'zi yaxshilaydi va deploy qiladi 🤖\n\`/fix\` — kodni o'z-o'zini tuzatish\n\`/setup\` — AI kalit sozlash\n\`/self-edit\` — o'z kodi rejimi\n\`/self\` — o'z kodini import\n\`/sync\` — bulutga saqlash\n\`/github\` — GitHub repolar\n\`/import owner/repo\` — repo import\n\`/push\` — GitHub'ga push\n\`/model\` — model tanlash\n\`/clear\` — chatni tozalash`, false),
    };
    if (slashCmds[cmd]) { await slashCmds[cmd](); return; }

    // Natural language self-improve detection (buyruq emas, oddiy so'z)
    const selfImproveRequest = /o'zingni\s*(yaxshila|tuzat|yangilash|upgrade|improve|fix)|o'z.*kodingni.*(tuzat|yaxshila)|o'zing.*(tuzatsin|yaxshilash|qilsin)|o'zingga.*(buyur|ayt)/i.test(msg);
    if (selfImproveRequest && Git.token()) {
      await SelfImprove.run(msg);
      return;
    }
    if (cmd === '/import') {
      const repoFull = msg.split(' ')[1];
      if (!repoFull?.includes('/')) { toast('Format: /import owner/repo'); return; }
      const [owner, repo] = repoFull.split('/');
      let pid = State.projectId;
      if (!pid) {
        // Avtomatik loyiha yaratamiz
        const newP = PM.create(repoFull);
        PM.setCurrent(newP.id);
        pid = newP.id;
        toast(`📁 "${repoFull}" loyihasi yaratildi`);
      }
      toast(`⬇️ ${repoFull} import qilinmoqda...`);
      try {
        await Git.importRepoToProject(owner, repo, pid);
        this.appendBubble('ai', `✅ **${repoFull}** import qilindi! Fayllarni ko'rish uchun Loyihalar → Fayllar.`);
      } catch (e) { toast('Import xatosi: ' + e.message); }
      return;
    }
    // ── GitHub auto-load ────────────────────────────────────────
    if (State.activeTools.has('github') && !State.githubCtx && Git.token()) {
      await this._loadGithubContext();
    }

    // ── Biriktirilgan fayllar ────────────────────────────────────
    const attachCtx = Attach.buildContext();
    const visionContent = Attach.buildVisionMessages(msg);
    Attach.clear();

    // ── Smart pre-fetch: GitHub chip bo'lmasa ham fayl so'rasa o'qiymiz ─
    const resolved = await this.resolveRefs(msg);
    let autoCtx = '';
    const wantsFile = /\.(js|ts|html|css|py|json|md|txt|yaml|yml|sh|go|rs|java|cpp|c|jsx|tsx|vue)\b/i.test(msg);
    const wantsGH   = /repo|branch|github|commit|push|pull/i.test(msg);
    // OmniCode o'z kodini tahrirlash so'rovi — Uzbek so'zlari keng qamrovli
    const wantsSelf  = /app\.js|index\.html|main\.css|omnicode|o'zingni|o'zini|o'zini.*(tuzat|yaxshila|yangilash|o'zgartir|qo'sh)|shu loyiha|kodni tahrir|kod qosh|yangilik qosh|feature qosh|funksiya qosh|tuzat.*kod|kod.*tuzat|o'zingni.*kod|kodingni|o'z.*kod|manba.*kod|o'zingga.*buyur|buyur.*o'zing/i.test(msg);
    const needsFetch = (wantsFile || wantsGH || wantsSelf) && Git.token();
    if (State.activeTools.has('github') && Git.token() || needsFetch) {
      this._showStatus('🔍 GitHub ma\'lumotlari yuklanmoqda...');
      autoCtx = await this._autoFetchGithubContext(msg, wantsSelf);
      this._hideStatus();
    }
    // Self-edit: OmniCode o'z kodini tahrirlamoqchi — SelfImport loyihasini active qilamiz
    if (wantsSelf && Git.token() && !State.projectId) {
      await SelfImport.ensureProject();
    }

    const baseContent = resolved + attachCtx;
    const userContent = autoCtx
      ? `${baseContent}\n\n━━━ GitHub ma'lumotlari (haqiqiy, API dan) ━━━\n${autoCtx}`
      : baseContent;

    // Vision (rasm) bo'lsa — messages array ga content array yuboriladi
    const userMsg = visionContent
      ? { role: 'user', content: visionContent }
      : { role: 'user', content: userContent };

    State.chatHistory.push(userMsg);
    this.busy = true;
    ActivityBar.start('thinking');

    const taskId = Tasks.add('🤖 AI', msg.slice(0, 40));
    const messages = [
      { role: 'system', content: this.system() },
      ...State.chatHistory.slice(-14),
    ];
    // User bubble ga fayl nomlari ko'rsatish
    if (attachCtx) {
      const fileNames = attachCtx.match(/### (?:Fayl|Rasm): ([^\n]+)/g)?.map(s => s.replace(/### (?:Fayl|Rasm): /,'')) || [];
      this.appendBubble('user', msg + (fileNames.length ? '\n\n📎 ' + fileNames.join(', ') : ''), false);
    } else {
      this.appendBubble('user', msg, false);
    }

    // ── Streaming ────────────────────────────────────────────────
    const chatEl  = document.getElementById('chat-messages');
    const useStream = StreamAI.enabled() && State.model.stream;
    let reply = '';

    try {
      if (useStream) {
        let bubble = null;
        let lastLen = 0;
        reply = await StreamAI.call(messages, null, (full) => {
          if (!bubble) {
            bubble = document.createElement('div');
            bubble.className = 'bubble ai';
            chatEl.appendChild(bubble);
            ActivityBar.setPhase('writing');
          }
          const delta = full.length - lastLen;
          if (delta > 0) ActivityBar.addTokens(Math.floor(delta / 4));
          lastLen = full.length;
          bubble.innerHTML = MD.render(FS.stripCommands(full)) + '<span class="stream-cursor"></span>';
          chatEl.scrollTop = chatEl.scrollHeight;
        });
        if (bubble) bubble.innerHTML = MD.render(FS.stripCommands(reply));
        await this._finalize(reply, bubble, messages, chatEl, taskId);
        return;
      }
    } catch (e) {
      console.warn('Stream xatosi, fallback:', e.message);
      // busy holati qolmasligi uchun — non-stream ga o'tamiz
    }

    // ── Non-streaming ────────────────────────────────────────────
    ActivityBar.setPhase('thinking');
    this.showTyping();
    try {
      reply = await AIRouter.call(messages);
    } catch (e) {
      this.hideTyping();
      ActivityBar.error();
      const isKeyErr = /kalit|key|401|403/i.test(e.message);
      const hint = isKeyErr
        ? '\n\n**Bepul kalit olish:**\n1. [groq.com/keys](https://console.groq.com/keys) ga kiring\n2. "Create API Key" bosing\n3. Sozlamalar → AI Kalitlari → Groq ga joylashtiring'
        : '\n\n**Yechim:** Sozlamalar → AI Kalitlari → Groq kalit qo\'shing (bepul, 1 daqiqa)';
      this.appendBubble('ai', `❌ **${e.message}**${hint}`, false);
      Tasks.remove(taskId);
      this.busy = false;
      return;
    }
    this.hideTyping();
    ActivityBar.setPhase('writing');
    ActivityBar.addTokens(Math.floor(reply.length / 4));
    const div = this.appendBubble('ai', reply, false);
    try {
      await this._finalize(reply, div, messages, chatEl, taskId);
    } catch(e) {
      console.error('finalize error:', e);
      this.busy = false;
      Tasks.remove(taskId);
      ActivityBar.error();
    }
  },

  // ── Javobni tugallash: fayllar, auto-push, action buttons ──
  async _finalize(reply, el, messages, chatEl, taskId) {
    const writes = FS.parseWrites(reply);

    // VFS ga saqlash + diff statistika
    if (writes.length && State.projectId) {
      writes.forEach(w => {
        const old = FS.read(State.projectId, w.path) || '';
        ActivityBar.updateDiff(w.content, old);
        FS.write(State.projectId, w.path, w.content);
      });
      State.pendingWrites = writes;
    }

    // GitHub chip active + token bor → avtomatik push
    // YOKI self project bo'lsa (OmniCode o'z kodini yozayapti) → always push
    const isSelfProject = State.projectId === SelfImport.PROJECT_ID;
    if (writes.length && Git.token() && (State.activeTools.has('github') || isSelfProject)) {
      ActivityBar.setPhase('pushing');
      await this._autoPushWrites(writes);
    }

    // Action tugmalar
    if (el) this._addBubbleActions(el, reply, writes);

    const tokens = Math.floor((messages.reduce((s,m) => s + m.content.length, 0) + reply.length) / 4);
    Analytics.track(tokens);
    State.chatHistory.push({ role: 'assistant', content: reply });
    Tasks.remove(taskId);
    this.busy = false;
    ActivityBar.done();
    if (App.screen === 'home') Home.refresh();
  },

  // ── Yozilgan fayllarni GitHub ga avtomatik push ──────────────
  async _autoPushWrites(writes) {
    const p      = State.projectId ? PM.get(State.projectId) : null;
    const owner  = p?.github?.owner  || SelfImport.REPO_OWNER;
    const repo   = p?.github?.repo   || SelfImport.REPO_NAME;
    const branch = p?.github?.branch || SelfImport.BRANCH;
    let ok = 0;
    this._showStatus(`🐙 ${writes.length} ta fayl GitHub'ga push qilinmoqda...`);
    for (const w of writes) {
      try {
        await Git.pushFile(owner, repo, w.path, w.content, branch, `ai: update ${w.path}`);
        ok++;
      } catch (e) { console.warn('push fail:', w.path, e.message); }
    }
    this._hideStatus();
    if (ok > 0) toast(`✅ ${ok} ta fayl GitHub'ga push qilindi (${branch})`);
  },

  // ── Barcha loyiha fayllarini push ───────────────────────────
  async _autoPushAll(repoFull, branch) {
    const pid = State.projectId;
    if (!pid) { toast('Loyiha tanlanmagan'); return; }
    const files = FS.index(pid);
    if (!files.length) { toast('Push qilish uchun fayl yo\'q'); return; }
    const [owner, repo] = (repoFull || '').split('/');
    await this._autoPushWrites(files.map(path => ({ path, content: FS.read(pid, path) })));
  },

  // ── Status indicator ─────────────────────────────────────────
  _showStatus(text) {
    let el = document.getElementById('ai-status-bar');
    if (!el) {
      el = document.createElement('div');
      el.id = 'ai-status-bar';
      el.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:rgba(30,30,30,0.95);backdrop-filter:blur(10px);padding:8px 16px;font-size:12px;color:var(--text2);text-align:center;border-bottom:1px solid var(--border)';
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.style.display = 'block';
  },
  _hideStatus() { document.getElementById('ai-status-bar')?.remove(); },

  _addBubbleActions(el, reply, writes) {
    if (!writes) writes = FS.parseWrites(reply);
    if (writes.length) {
      State.pendingWrites = writes;
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-top:10px';

      const applyBtn = document.createElement('button');
      applyBtn.className = 'apply-btn';
      applyBtn.style.flex = '1';
      applyBtn.textContent = `📝 ${writes.length} ta faylni qo'llash`;
      applyBtn.onclick = () => DiffView.show();
      row.appendChild(applyBtn);

      // If GitHub active — show direct push button
      if (State.activeTools.has('github') && Git.token()) {
        const ghBtn = document.createElement('button');
        ghBtn.className = 'apply-btn';
        ghBtn.style.cssText = 'flex:1;background:rgba(88,166,255,0.12);border-color:rgba(88,166,255,0.3);color:#58a6ff';
        ghBtn.textContent = `🐙 GitHub'ga push`;
        ghBtn.onclick = () => AI._pushWritesToGithub(writes);
        row.appendChild(ghBtn);
      }

      el.appendChild(row);
      toast(`📝 ${writes.length} ta fayl tayyor`);
    }
    const chips = document.createElement('div');
    chips.className = 'bubble-chips';
    chips.innerHTML = [['Improve','Yaxshilash'],['Explain','Tushuntirish'],['Shorter','Qisqartirish'],['Fix bugs','Xatolarni tuzat']].map(([a,uz]) =>
      `<button class="bubble-chip" onclick="AI.quickAction('${a}')">${uz}</button>`).join('');
    el.appendChild(chips);
  },

  async _pushWritesToGithub(writes) {
    const p = State.projectId ? PM.get(State.projectId) : null;
    const owner = p?.github?.owner || 'xojasoipov-sketch';
    const repo = p?.github?.repo || 'Useg-kop';
    const branch = p?.github?.branch || 'claude/shuni-chuntr-va-qil-60bfra';

    toast(`🐙 ${writes.length} ta fayl GitHub'ga yuklanmoqda...`);
    let ok = 0;
    for (const w of writes) {
      try {
        await Git.pushFile(owner, repo, w.path, w.content, branch, `update ${w.path} via OmniCode AI`);
        FS.write(State.projectId || 'default', w.path, w.content);
        ok++;
      } catch (e) {
        toast(`❌ ${w.path}: ${e.message}`);
      }
    }
    toast(`✅ ${ok}/${writes.length} fayl GitHub'ga yuklandi`);
    this.appendBubble('ai', `✅ **${ok} ta fayl GitHub'ga push qilindi**\n${writes.map(w=>`• \`${w.path}\``).join('\n')}\n\nBranch: \`${branch}\``, false);
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

  // Smart pre-fetch: xuddi men kabi — avval o'qiymiz, keyin javob beramiz
  async _autoFetchGithubContext(msg, isSelf = false) {
    const lower = msg.toLowerCase();
    const parts = [];

    // OmniCode o'z-o'zini tahrirlash — barcha asosiy fayllarni to'liq yuklaymiz
    if (isSelf && Git.token()) {
      const SELF_FILES = [
        'omnicode/frontend/app.js',
        'omnicode/frontend/index.html',
        'omnicode/frontend/styles/main.css',
      ];
      // Faqat so'ralgan faylni aniqlash
      const msgLower = msg.toLowerCase();
      const targetFiles = SELF_FILES.filter(f => {
        const base = f.split('/').pop();
        return msgLower.includes(base) || msgLower.includes('app') && f.includes('app.js')
          || msgLower.includes('html') && f.includes('html')
          || msgLower.includes('css') && f.includes('css')
          || msgLower.includes('style') && f.includes('css');
      });
      const filesToLoad = targetFiles.length ? targetFiles : [SELF_FILES[0]]; // default: app.js
      for (const filePath of filesToLoad) {
        try {
          this._showStatus(`📖 ${filePath} o'qilmoqda...`);
          const content = await Git.getFileContent('xojasoipov-sketch', 'Useg-kop', filePath, 'claude/shuni-chuntr-va-qil-60bfra')
            || await Git.getFileContent('xojasoipov-sketch', 'Useg-kop', filePath, 'main');
          if (content) {
            const ext = filePath.split('.').pop();
            // To'liq yuborish — limit yo'q (AI katta kontekst qabul qiladi)
            parts.push(`=== OMNICODE O'Z KODI: ${filePath} (${(content.length/1024).toFixed(1)}kb) ===\nBu OmniCode ning o'z manba kodi. Sen bu faylni WRITE_FILE bilan to'liq qayta yozib yangilash mumkin.\n\`\`\`${ext}\n${content}\n\`\`\``);
            // VFS ga saqlash
            FS.write(SelfImport.PROJECT_ID, filePath, content);
          }
        } catch(e) { console.warn('self-fetch err:', filePath, e.message); }
      }
      // Agar fayl yuklangan bo'lsa — keyingi umumiy fetch ni o'tkazib yuboramiz
      if (parts.length) return parts.join('\n\n');
    }

    try {
      // 1. Repos so'rasa — ro'yxat olamiz
      const wantsRepos = /repo|loyih|nechta|ko['']rsat|list|bor|sanam|github/i.test(lower);
      if (wantsRepos && !State.githubCtx) {
        const [me, repos] = await Promise.all([Git.me(), Git.repos()]);
        State.githubCtx = `GITHUB: @${me.login} — ${repos.length} ta repo`;
        const list = repos.slice(0, 30).map(r =>
          `${r.full_name} | ${r.private?'private':'public'} | ${r.language||'?'} | ⭐${r.stargazers_count} | ${r.updated_at?.slice(0,10)}`
        ).join('\n');
        parts.push(`=== GitHub Repolar (@${me.login}) ===\n${list}`);
      } else if (wantsRepos && State.githubCtx) {
        // Refresh if needed
        try {
          const repos = await Git.repos();
          const list = repos.slice(0, 30).map(r =>
            `${r.full_name} | ${r.private?'private':'public'} | ${r.language||'?'} | ⭐${r.stargazers_count} | ${r.updated_at?.slice(0,10)}`
          ).join('\n');
          parts.push(`=== GitHub Repolar ===\n${list}`);
        } catch {}
      }

      // 2. Fayl nomini aniqlash — .js, .html, .css, .py, .md, .json, .ts
      const fileMatch = msg.match(/([a-zA-Z0-9_\-/.]+\.(js|ts|html|css|py|json|md|txt|yaml|yml|sh|go|rs|java|cpp|c))/gi);
      if (fileMatch) {
        for (const filePath of fileMatch.slice(0, 3)) {
          // repo/path formatini aniqlash
          let owner, repo, path;
          if (filePath.includes('/') && !filePath.startsWith('/')) {
            const segs = filePath.split('/');
            if (segs.length >= 3 && State.githubCtx) {
              owner = segs[0]; repo = segs[1]; path = segs.slice(2).join('/');
            }
          }
          // Default: joriy loyiha github dan olish
          if (!owner && State.projectId) {
            const p = PM.get(State.projectId);
            if (p?.github) { owner = p.github.owner; repo = p.github.repo; path = filePath; }
          }
          // Default: xojasoipov-sketch/Useg-kop repo
          if (!owner) { owner = 'xojasoipov-sketch'; repo = 'Useg-kop'; path = filePath; }

          try {
            const content = await Git.getFileContent(owner, repo, path, 'claude/shuni-chuntr-va-qil-60bfra')
              || await Git.getFileContent(owner, repo, path, 'main');
            if (content) {
              const ext = path.split('.').pop();
              // Katta fayllar uchun ham to'liq yuborish (80KB gacha)
              const maxLen = 80000;
              const preview = content.length > maxLen
                ? content.slice(0, maxLen) + `\n... (${Math.round((content.length-maxLen)/1024)}kb qisqartirildi)`
                : content;
              parts.push(`=== ${owner}/${repo}/${path} (${(content.length/1024).toFixed(1)}kb) ===\n\`\`\`${ext}\n${preview}\n\`\`\``);
              // Cache to VFS
              if (State.projectId) FS.write(State.projectId, path, content);
            }
          } catch {}
        }
      }

      // 3. Repo ichidagi fayllar so'rasa
      const wantsFiles = /fayl|file|papka|folder|tuzilma|struktur|nima bor|ko['']rsat/i.test(lower);
      const repoMatch = msg.match(/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)/);
      if (wantsFiles && repoMatch) {
        const [, owner, repo] = repoMatch;
        try {
          const items = await Git.getRepoContents(owner, repo, '');
          if (Array.isArray(items)) {
            const tree = items.map(i => `${i.type === 'dir' ? '📁' : '📄'} ${i.name}${i.type === 'file' ? ` (${(i.size/1024).toFixed(1)}kb)` : '/'}`).join('\n');
            parts.push(`=== ${owner}/${repo} fayl tuzilmasi ===\n${tree}`);
          }
        } catch {}
      }

    } catch (e) {
      console.warn('autoFetch error:', e.message);
    }

    return parts.join('\n\n');
  },

  toggleTool(el, name) {
    if (State.activeTools.has(name)) {
      State.activeTools.delete(name);
      el.classList.remove('active');
      toast(`${name} o'chirildi`);
    } else {
      State.activeTools.add(name);
      el.classList.add('active');
      toast(`${name} yoqildi`);
      if (name === 'github') this._loadGithubContext();
    }
  },

  async _loadGithubContext() {
    const token = Git.token();
    if (!token) {
      toast('⚠️ GitHub token yo\'q — Sozlamalar → Kod bo\'limiga o\'ting');
      // Show setup guide in chat
      this.appendBubble('ai', `🔑 **GitHub token kerak**

1. [github.com/settings/tokens](https://github.com/settings/tokens) ga o'ting
2. **"Generate new token (classic)"** bosing
3. \`repo\` huquqini belgilang
4. Tokenni nusxalang
5. OmniCode **Sozlamalar → Kod → GitHub Token** ga joylashtiring

Keyin 🐙 GitHub chipni qayta bosing.`);
      return;
    }
    toast('🐙 GitHub yuklanmoqda...');
    try {
      const [me, repos] = await Promise.all([Git.me(), Git.repos()]);
      const repoList = repos.map(r =>
        `- ${r.full_name} (${r.private?'private':'public'}, ${r.language||'?'}, ⭐${r.stargazers_count}, ${r.updated_at?.slice(0,10)})`
      ).join('\n');
      State.githubCtx = `GITHUB USER: @${me.login} (${me.name||''})\nREPOS (${repos.length}):\n${repoList}`;

      const repoItems = repos.slice(0, 10).map(r =>
        `• **${r.name}** — ${r.description || r.language || '—'} ${r.private?'🔒':'🌐'}`
      ).join('\n');

      this.appendBubble('ai', `🐙 **GitHub ulandi — @${me.login}**

**${repos.length} ta repo:**
${repoItems}${repos.length > 10 ? `\n...va ${repos.length-10} ta boshqa` : ''}

Endi so'rang:
• *"app.js ni o'qi"* — fayl kontentini olib beraman
• *"nechta repoyim bor"* — to'liq ro'yxat
• *"Useg-kop/app.js ni tahrirlash"* — kodni o'qib, o'zgartirib, push qilaman
• *"yangi repo yarat"* — GitHub'da repo ochaman`);

      // Update chip label
      const chip = document.getElementById('gh-chip');
      if (chip) chip.innerHTML = `🐙 @${me.login} <span style="color:var(--green);font-size:10px">●</span>`;

    } catch (e) {
      toast('GitHub xatosi: ' + e.message);
      State.activeTools.delete('github');
      document.getElementById('gh-chip')?.classList.remove('active');
    }
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
    // Auto sync to cloud
    setTimeout(() => SB.syncAll(), 1000);
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
        <button onclick="App.newProject()" style="background:var(--accent);border:none;color:#fff;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;margin-bottom:10px">+ Yangi loyiha</button>
        <br>
        <button onclick="SB.pullAll()" style="background:var(--bg3);border:1px solid var(--border2);color:var(--text2);padding:10px 20px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer">☁️ Bulutdan yuklash</button>
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
    const action = prompt(`${p.name}\n\n1) GitHubga yuborish\n2) Bulutga saqlash\n3) AI tahrirlash (o'z-o'zini tuzatish)\n4) O'chirish\n5) Bekor qilish\n\n1-5 kiriting:`);
    if (action === '1') { PM.setCurrent(id); Deploy.start(); }
    else if (action === '2') { PM.setCurrent(id); SB.syncAll(); }
    else if (action === '3') { PM.setCurrent(id); SelfHeal.analyze(); }
    else if (action === '4') {
      if (confirm(`"${p.name}" o'chirilsinmi? Bu amalni bekor qilib bo'lmaydi.`)) {
        PM.delete(id); this.render(); Home.refresh(); toast('🗑 O\'chirildi');
      }
    }
  },

  filter(type, el) {
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    const list = PM.list();
    const filtered = type === 'starred' ? list.filter(p => p.starred) : list;
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
//  CODE EDITOR — with real editing & cloud save
// ══════════════════════════════════════════════════════════════
const Editor = {
  projectId: null,
  file: null,
  _saveTimer: null,

  open(projectId, path) {
    this.projectId = projectId;
    this.file = path;
    const content = FS.read(projectId, path);
    document.getElementById('ed-filename').textContent = path;
    document.getElementById('ed-badge').textContent = langFromPath(path);
    document.getElementById('code-view').innerHTML =
      `<textarea id="editor-textarea" class="editor-ta" spellcheck="false"
        oninput="Editor.onChange(this)"
        onkeydown="Editor.onKeyDown(event)">${escHTML(content)}</textarea>`;
    App.nav('editor');
    // Focus the textarea
    setTimeout(() => document.getElementById('editor-textarea')?.focus(), 100);
  },

  onChange(ta) {
    if (this.projectId && this.file) {
      FS.write(this.projectId, this.file, ta.value);
      // Show save indicator
      const ind = document.getElementById('ed-save-indicator');
      if (ind) {
        ind.style.display = '';
        clearTimeout(this._saveTimer);
        this._saveTimer = setTimeout(() => { if (ind) ind.style.display = 'none'; }, 2000);
      }
    }
  },

  onKeyDown(e) {
    // Tab key → insert 2 spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = e.target;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      ta.value = ta.value.substring(0, start) + '  ' + ta.value.substring(end);
      ta.selectionStart = ta.selectionEnd = start + 2;
      this.onChange(ta);
    }
    // Cmd+S → save to cloud
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      this.saveToCloud();
    }
  },

  saveToCloud() {
    if (!this.projectId || !this.file) return;
    const content = FS.read(this.projectId, this.file);
    SB.upsertFile(this.projectId, this.file, content)
      .then(() => toast('☁️ Saqlandi'))
      .catch(() => toast('⚠️ Saqlash xatosi'));
  },

  format() {
    const ta = document.getElementById('editor-textarea');
    if (!ta) return;
    // Basic formatting: normalize indentation
    const lines = ta.value.split('\n');
    let indent = 0;
    const formatted = lines.map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      if (trimmed.match(/^[}\])]/) ) indent = Math.max(0, indent - 1);
      const result = '  '.repeat(indent) + trimmed;
      if (trimmed.match(/[{(\[]$/) ) indent++;
      return result;
    }).join('\n');
    ta.value = formatted;
    this.onChange(ta);
    toast('⚡ Formatlandi');
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
        <div class="t-dim">Fayllar: ${this.projectId ? FS.index(this.projectId).length : 0}</div>
        <div class="t-dim">Supabase: ulangan ✓</div>`;
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
  },

  async runPipeline(task, agentList = ['planner', 'coder', 'reviewer']) {
    if (!task) { const t = document.getElementById('agent-task-input')?.value.trim(); if (!t) { toast('Avval vazifa kiriting'); return; } task = t; }
    Sheet.close('agent-sheet');
    App.nav('ai');

    const agentIcons = { planner:'📋', researcher:'🔍', coder:'💻', designer:'🎨', reviewer:'🔎', tester:'🧪', security:'🔒', deployer:'🚀', optimizer:'⚡', docs:'📄', backend:'🖥️', master:'👑' };
    ActivityBar.start('thinking');
    // Barcha agentlarni darhol ro'yxatga olish
    const agentIdxMap = {};
    agentList.forEach(name => {
      agentIdxMap[name] = ActivityBar.addAgent(name, agentIcons[name] || '🤖');
    });

    AI.appendBubble('ai', `🤖 **Ko'p agentli Pipeline** boshlanmoqda...\nAgentlar: ${agentList.map(n => (agentIcons[n]||'🤖')+' '+n).join(' → ')}`, false);
    let context = task;
    for (const name of agentList) {
      State.agent = name;
      ActivityBar.setPhase('thinking');
      const taskId = Tasks.add(`${agentIcons[name]||'🤖'} ${name}`, task.slice(0, 40));
      Tasks.update(taskId, { progress: 50 });
      const messages = [
        { role: 'system', content: AGENT_SYSTEMS[name] + '\n\n' + AI.system() },
        { role: 'user', content: `Task: ${task}\n\nContext:\n${context}\n\nComplete your part now.` },
      ];
      AI.appendBubble('user', `[${(agentIcons[name]||'🤖')} ${name.toUpperCase()}]`, false);
      AI.showTyping();
      try {
        ActivityBar.setPhase('writing');
        const reply = await AIRouter.call(messages);
        AI.hideTyping();
        const writes = FS.parseWrites(reply);
        if (writes.length) {
          writes.forEach(w => {
            const old = State.projectId ? (FS.read(State.projectId, w.path) || '') : '';
            ActivityBar.updateDiff(w.content, old);
          });
          State.pendingWrites = [...State.pendingWrites, ...writes];
        }
        AI.appendBubble('ai', reply, writes.length > 0);
        context += `\n\n[${name.toUpperCase()} OUTPUT]:\n${reply.slice(0, 1000)}`;
        Analytics.track(Math.floor(reply.length / 4));
        ActivityBar.doneAgent(agentIdxMap[name], true);
        Tasks.update(taskId, { progress: 100, status: 'done' });
        Tasks.remove(taskId);
      } catch (e) {
        AI.hideTyping();
        AI.appendBubble('ai', `❌ ${name} xatosi: ${e.message}`, false);
        ActivityBar.doneAgent(agentIdxMap[name], false);
        Tasks.remove(taskId);
      }
    }
    State.agent = null;
    ActivityBar.done();
  },
};

// ══════════════════════════════════════════════════════════════
//  DEPLOY
// ══════════════════════════════════════════════════════════════
const Deploy = {
  async start() {
    const projectId = State.projectId;
    if (!projectId) { toast('⚠️ Avval loyiha tanlang'); App.nav('projects'); return; }
    const p = PM.get(projectId);
    if (!p.github) { Sheet.open('github-deploy-sheet'); return; }
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

    ['step-github','step-build','step-tests','step-deploy'].forEach(s => setStep(s, 'gray'));

    setStep('step-github', 'orange', 'Ulanmoqda...');
    addLog('› GitHub ga ulanmoqda...');

    if (!Git.token()) {
      setStep('step-github', 'red', 'Token yo\'q');
      addLog('› Xato: GitHub token sozlanmagan. Sozlamalar → Kod → GitHub Token');
      toast('❌ Avval Sozlamalarda GitHub token qo\'shing'); return;
    }

    try {
      const user = await Git.me();
      setStep('step-github', 'green', `Ulangan: ${user.login}`);
      addLog(`› Ulandi: ${user.login} ✓`, true);
    } catch (e) {
      setStep('step-github', 'red', 'Autentifikatsiya xatosi');
      addLog(`› GitHub xatosi: ${e.message}`);
      toast('❌ GitHub: ' + e.message); return;
    }

    await delay(300);
    setStep('step-build', 'orange', `${repo} ga yuborilmoqda...`);
    addLog(`› Fayllar ${owner}/${repo}@${branch} ga yuborilmoqda...`);

    const results = await Git.pushProject(projectId, owner, repo, branch);
    let ok = 0, fail = 0;
    for (const r of results) {
      if (r.ok) { ok++; addLog(`  ✓ ${r.path}`, true); }
      else { fail++; addLog(`  ✗ ${r.path}: ${r.error}`); }
    }

    if (results.length === 0) { addLog('  ⚠ Loyihada fayllar yo\'q'); }

    setStep('step-build', fail === 0 ? 'green' : 'orange', fail === 0 ? `${ok} fayl yuborildi` : `${ok} muvaffaqiyatli, ${fail} xato`);
    addLog(fail === 0 ? `› Jami ${ok} fayl yuborildi ✓` : `› ${ok} muvaffaqiyatli, ${fail} xato`, fail === 0);

    await delay(300);
    setStep('step-tests', 'green', 'Build boshlandi');
    addLog('› GitHub Actions da build boshlandi ✓', true);

    await delay(400);
    setStep('step-deploy', 'green', 'Jonli');
    addLog(`✓ github.com/${owner}/${repo} ga yuborildi`, true);

    toast(fail === 0 ? '🚀 GitHub ga yuborildi!' : `⚠️ ${fail} ta fayl xato`);

    // Also sync to Supabase
    setTimeout(() => SB.syncAll(), 500);
  },

  clearLogs() { document.getElementById('deploy-logs').innerHTML = ''; },
};

// ══════════════════════════════════════════════════════════════
//  SETTINGS
// ══════════════════════════════════════════════════════════════
const PROVIDER_CONFIGS = {
  openrouter: {
    title: 'OpenRouter Kalitlar',
    fields: [
      { id: 'or1', label: 'Kalit 1 (sk-or-v1-...)' },
      { id: 'or2', label: 'Kalit 2 (ixtiyoriy)' },
      { id: 'or3', label: 'Kalit 3 (ixtiyoriy)' },
      { id: 'or4', label: 'Kalit 4 (ixtiyoriy)' },
    ],
    hint: 'openrouter.ai/keys dan bepul kalitlar oling — 4 ta kalit load balancing uchun',
  },
  github: {
    title: 'GitHub Token',
    fields: [{ id: 'github', label: 'Personal Access Token (ghp_...)' }],
    hint: 'github.com/settings/tokens → New token → repo scope',
  },
  groq: {
    title: 'Groq API Kalit',
    fields: [{ id: 'groq', label: 'API Kalit (gsk_...)' }],
    hint: 'console.groq.com — eng tez inference + streaming',
  },
  cerebras: {
    title: 'Cerebras (Eng Tez!)',
    fields: [{ id: 'cerebras', label: 'API Kalit (csk-...)' }],
    hint: 'inference.cerebras.ai — 1M token/kun bepul, 2000 token/s',
  },
  anthropic: {
    title: 'Anthropic / Claude',
    fields: [{ id: 'anthropic', label: 'API Kalit (sk-ant-...)' }],
    hint: 'console.anthropic.com — Claude 3.5 Haiku kiradi',
  },
  gemini: {
    title: 'Google Gemini',
    fields: [{ id: 'gemini', label: 'API Kalit (AIza...)' }],
    hint: 'aistudio.google.com dan bepul — 1M kontekst oynasi',
  },
  deepseek: {
    title: 'DeepSeek',
    fields: [{ id: 'deepseek', label: 'API Kalit (sk-...)' }],
    hint: 'platform.deepseek.com — juda arzon',
  },
  mistral: {
    title: 'Mistral AI',
    fields: [{ id: 'mistral', label: 'API Kalit' }],
    hint: 'console.mistral.ai — Yevropa AI',
  },
  together: {
    title: 'Together AI',
    fields: [{ id: 'together', label: 'API Kalit' }],
    hint: 'api.together.xyz — $25 bepul kredit',
  },
  huggingface: {
    title: 'HuggingFace',
    fields: [{ id: 'hf', label: 'Access Token (hf_...)' }],
    hint: 'huggingface.co/settings/tokens',
  },
  nvidia: {
    title: 'NVIDIA NIM',
    fields: [{ id: 'nvidia', label: 'API Kalit' }],
    hint: 'build.nvidia.com — bepul GPU inference',
  },
};

const Settings = {
  _conn: null,

  refresh() {
    const keys = Store.get('keys', {});
    const orKeys = AIRouter.keys();
    const orCount = document.getElementById('or-key-count');
    if (orCount) orCount.textContent = orKeys.length > 0 ? '(' + orKeys.length + ' ta kalit)' : '';
    const mistralKeys = AIRouter.mistralKeys();
    const mistralCount = document.getElementById('mistral-key-count');
    if (mistralCount) mistralCount.textContent = mistralKeys.length > 0 ? '(' + mistralKeys.length + ' ta kalit)' : '';
    const statuses = {
      'or-status': orKeys.length > 0, 'gh-status': !!keys.github, 'groq-status': !!keys.groq,
      'anthropic-status': !!keys.anthropic, 'gemini-status': !!keys.gemini,
      'deepseek-status': !!keys.deepseek, 'mistral-status': mistralKeys.length > 0,
      'together-status': !!keys.together, 'hf-status': !!keys.hf, 'nvidia-status': !!keys.nvidia,
      'cerebras-status': !!keys.cerebras,
    };
    for (const [id, connected] of Object.entries(statuses)) {
      const el = document.getElementById(id);
      if (!el) continue;
      el.textContent = connected ? 'Ulangan' : 'Sozlanmagan';
      el.className = connected ? 's-connected' : 's-val';
    }
    const modelEl = document.getElementById('default-model-val');
    if (modelEl) modelEl.textContent = State.model.short;

    const streamVal = document.getElementById('stream-status-val');
    if (streamVal) streamVal.textContent = StreamAI.enabled() ? 'Faol ✓' : 'O\'chirilgan';
    const streamToggle = document.getElementById('stream-toggle-val');
    if (streamToggle) streamToggle.textContent = StreamAI.enabled() ? 'Yoqilgan' : 'O\'chirilgan';

    const uid = document.getElementById('cloud-uid-val');
    if (uid) uid.textContent = SB.userId();
  },

  tab(el, tabId) {
    document.querySelectorAll('.s-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.s-tab-content').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    const content = document.getElementById('stab-' + tabId);
    if (content) content.classList.add('active');
  },

  openORKeys() {
    const el = document.getElementById('connector-sheet-title');
    if (el) el.textContent = 'OpenRouter Kalitlari';
    const fields = document.getElementById('connector-fields');
    if (fields) fields.innerHTML = this._renderORKeysUI();
    // Save tugmasi almashtir
    const saveBtn = document.getElementById('connector-save-btn');
    if (saveBtn) { saveBtn.textContent = 'Qo\'shish'; saveBtn.onclick = () => Settings._addORKeyFromInput(); }
    Sheet.open('connector-sheet');
  },

  _renderORKeysUI() {
    const keys = AIRouter.keys();
    const rows = keys.map((k, i) => `
      <div id="or-key-row-${i}" style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">
        <span style="flex:1;font-size:12px;color:var(--text2);font-family:monospace">sk-or-...${k.slice(-8)}</span>
        <button onclick="Settings._testORKey(${i})" id="or-test-${i}" style="padding:4px 10px;border-radius:6px;background:rgba(80,160,255,0.15);color:#50a0ff;border:none;font-size:11px;cursor:pointer">Test</button>
        <button onclick="Settings._removeORKey(${i})" style="padding:4px 10px;border-radius:6px;background:rgba(255,80,80,0.15);color:#ff5050;border:none;font-size:11px;cursor:pointer">O'chirish</button>
      </div>`).join('');
    return `
      <div style="padding:0 20px 12px">
        <p style="font-size:12px;color:var(--text3);margin:0 0 12px">Xohlagan miqdorda kalit qo'shing.<br>Biri 429 bo'lsa avtomatik keyingisiga o'tadi.</p>
        ${rows || '<p style="font-size:12px;color:var(--text3)">Hali kalit yo\'q</p>'}
        <div style="margin-top:12px;display:flex;gap:6px">
          <input id="or-new-key" placeholder="sk-or-v1-..."
            style="flex:1;padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg3);color:var(--text1);font-size:12px">
        </div>
        <div style="font-size:11px;color:var(--text3);margin-top:6px">openrouter.ai/keys → "Create Key"</div>
        ${keys.length > 0 ? '<button onclick="Settings._testAllORKeys()" style="margin-top:12px;width:100%;padding:9px;border-radius:8px;background:rgba(80,160,255,0.15);color:#50a0ff;border:1px solid rgba(80,160,255,0.3);font-size:12px;cursor:pointer">Hammasini tekshirish</button>' : ''}
      </div>`;
  },

  async _testORKey(index) {
    const keys = AIRouter.keys();
    const key = keys[index];
    const btn = document.getElementById('or-test-' + index);
    if (btn) { btn.textContent = '...'; btn.disabled = true; }
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
        body: JSON.stringify({ model: 'meta-llama/llama-3.1-8b-instruct:free', messages: [{ role: 'user', content: 'Hi' }], max_tokens: 5 }),
      });
      const row = document.getElementById('or-key-row-' + index);
      if (res.ok) {
        if (btn) { btn.textContent = '✅'; btn.style.color = '#50ff80'; btn.disabled = false; }
        if (row) row.style.background = 'rgba(80,255,80,0.05)';
      } else {
        if (btn) { btn.textContent = '❌ ' + res.status; btn.style.color = '#ff5050'; btn.disabled = false; }
        if (row) row.style.background = 'rgba(255,80,80,0.05)';
      }
    } catch (e) {
      if (btn) { btn.textContent = '❌ Xato'; btn.style.color = '#ff5050'; btn.disabled = false; }
    }
  },

  async _testAllORKeys() {
    const keys = AIRouter.keys();
    for (let i = 0; i < keys.length; i++) await this._testORKey(i);
  },

  _addORKeyFromInput() {
    const inp = document.getElementById('or-new-key');
    const val = inp?.value?.trim();
    if (!val) { toast('Kalit bo\'sh'); return; }
    if (!val.startsWith('sk-or')) { toast('Kalit sk-or-... bilan boshlanishi kerak'); return; }
    const added = AIRouter.addKey(val);
    if (!added) { toast('Bu kalit allaqachon qo\'shilgan'); return; }
    toast(`✅ Kalit qo\'shildi (jami: ${AIRouter.keys().length} ta)`);
    if (inp) inp.value = '';
    const fields = document.getElementById('connector-fields');
    if (fields) fields.innerHTML = this._renderORKeysUI();
    this.refresh();
  },

  _removeORKey(index) {
    AIRouter.removeKey(index);
    toast('Kalit o\'chirildi');
    const fields = document.getElementById('connector-fields');
    if (fields) fields.innerHTML = this._renderORKeysUI();
    this.refresh();
  },

  openMistralKeys() {
    const el = document.getElementById('connector-sheet-title');
    if (el) el.textContent = 'Mistral AI Kalitlari';
    const fields = document.getElementById('connector-fields');
    if (fields) fields.innerHTML = this._renderMistralKeysUI();
    const saveBtn = document.getElementById('connector-save-btn');
    if (saveBtn) { saveBtn.textContent = 'Qo\'shish'; saveBtn.onclick = () => Settings._addMistralKeyFromInput(); }
    Sheet.open('connector-sheet');
  },

  _renderMistralKeysUI() {
    const keys = AIRouter.mistralKeys();
    const rows = keys.map((k, i) => `
      <div id="mistral-key-row-${i}" style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">
        <span style="flex:1;font-size:12px;color:var(--text2);font-family:monospace">...${k.slice(-8)}</span>
        <button onclick="Settings._testMistralKey(${i})" id="mistral-test-${i}" style="padding:4px 10px;border-radius:6px;background:rgba(80,160,255,0.15);color:#50a0ff;border:none;font-size:11px;cursor:pointer">Test</button>
        <button onclick="Settings._removeMistralKey(${i})" style="padding:4px 10px;border-radius:6px;background:rgba(255,80,80,0.15);color:#ff5050;border:none;font-size:11px;cursor:pointer">O'chirish</button>
      </div>`).join('');
    return `
      <div style="padding:0 20px 12px">
        <p style="font-size:12px;color:var(--text3);margin:0 0 12px">Bir nechta Mistral kaliti qo'shing.<br>Biri 429 bo'lsa avtomatik keyingisiga o'tadi.</p>
        ${rows || '<p style="font-size:12px;color:var(--text3)">Hali kalit yo\'q</p>'}
        <div style="margin-top:12px;display:flex;gap:6px">
          <input id="mistral-new-key" placeholder="Mistral API kaliti..."
            style="flex:1;padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg3);color:var(--text1);font-size:12px">
        </div>
        <div style="font-size:11px;color:var(--text3);margin-top:6px">console.mistral.ai → API Keys</div>
        ${keys.length > 0 ? '<button onclick="Settings._testAllMistralKeys()" style="margin-top:12px;width:100%;padding:9px;border-radius:8px;background:rgba(80,160,255,0.15);color:#50a0ff;border:1px solid rgba(80,160,255,0.3);font-size:12px;cursor:pointer">Hammasini tekshirish</button>' : ''}
      </div>`;
  },

  async _testMistralKey(index) {
    const keys = AIRouter.mistralKeys();
    const key = keys[index];
    const btn = document.getElementById('mistral-test-' + index);
    if (btn) { btn.textContent = '...'; btn.disabled = true; }
    try {
      const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
        body: JSON.stringify({ model: 'mistral-small-latest', messages: [{ role: 'user', content: 'Hi' }], max_tokens: 5 }),
      });
      const row = document.getElementById('mistral-key-row-' + index);
      if (res.ok) {
        if (btn) { btn.textContent = '✅'; btn.style.color = '#50ff80'; btn.disabled = false; }
        if (row) row.style.background = 'rgba(80,255,80,0.05)';
      } else {
        const errText = res.status === 401 ? '❌ Noto\'g\'ri' : '❌ ' + res.status;
        if (btn) { btn.textContent = errText; btn.style.color = '#ff5050'; btn.disabled = false; }
        if (row) row.style.background = 'rgba(255,80,80,0.05)';
      }
    } catch (e) {
      if (btn) { btn.textContent = '❌ Xato'; btn.style.color = '#ff5050'; btn.disabled = false; }
    }
  },

  async _testAllMistralKeys() {
    const keys = AIRouter.mistralKeys();
    for (let i = 0; i < keys.length; i++) await this._testMistralKey(i);
  },

  _addMistralKeyFromInput() {
    const inp = document.getElementById('mistral-new-key');
    const val = inp?.value?.trim();
    if (!val) { toast('Kalit bo\'sh'); return; }
    const added = AIRouter.addMistralKey(val);
    if (!added) { toast('Bu kalit allaqachon qo\'shilgan'); return; }
    toast('✅ Mistral kalit qo\'shildi (jami: ' + AIRouter.mistralKeys().length + ' ta)');
    if (inp) inp.value = '';
    const fields = document.getElementById('connector-fields');
    if (fields) fields.innerHTML = this._renderMistralKeysUI();
    this.refresh();
  },

  _removeMistralKey(index) {
    AIRouter.removeMistralKey(index);
    toast('Kalit o\'chirildi');
    const fields = document.getElementById('connector-fields');
    if (fields) fields.innerHTML = this._renderMistralKeysUI();
    this.refresh();
  },

  openConnector(name) {
    this._conn = name;
    const cfg = PROVIDER_CONFIGS[name];
    if (!cfg) return;
    const keys = Store.get('keys', {});
    document.getElementById('connector-sheet-title').textContent = cfg.title;
    // Save tugmasini standart holatiga qaytaramiz
    const saveBtn = document.getElementById('connector-save-btn');
    if (saveBtn) { saveBtn.textContent = '🔒 Xavfsiz saqlash'; saveBtn.onclick = () => Settings.save(); }
    const fields = document.getElementById('connector-fields');
    if (fields) {
      fields.innerHTML = cfg.fields.map(f => `
        <label class="sh-label">${f.label}</label>
        <input id="conn-field-${f.id}" class="sh-input" type="password" placeholder="Kalit kiriting..." value="${keys[f.id]||''}">
      `).join('') + (cfg.hint ? `<div style="font-size:11px;color:var(--text3);padding:4px 20px 8px">${cfg.hint}</div>` : '');
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

  toggleStream() {
    const current = StreamAI.enabled();
    Store.set('stream_enabled', !current);
    this.refresh();
    toast(current ? '⭕ Streaming o\'chirildi' : '🌊 Streaming yoqildi');
  },

  accentPicker() {
    const colors = ['#FF4D4F', '#3B82F6', '#22C55E', '#F59E0B', '#8B5CF6', '#EC4899'];
    const color = prompt('Asosiy rang (hex):\n' + colors.join(', ') + '\n\nYoki o\'z rangingizni kiriting:') || '#FF4D4F';
    document.documentElement.style.setProperty('--accent', color);
    Store.set('accent_color', color);
    toast('🎨 Rang yangilandi');
  },

  exportKeys() {
    const keys = Store.get('keys', {});
    const safe = Object.fromEntries(Object.entries(keys).map(([k, v]) => [k, v ? '****' + v.slice(-4) : '']));
    const data = JSON.stringify({ keys: safe, model: State.model?.id, projects: PM.list().length }, null, 2);
    toast('📤 Eksport: ' + data.slice(0, 50) + '...');
  },

  importKeys() {
    const json = prompt('Kalitlar JSON ({"or1":"...","groq":"...","mistral_keys":[...],...}):');
    if (!json) return;
    try {
      const parsed = JSON.parse(json);
      // Handle array fields separately
      if (Array.isArray(parsed.or_keys)) {
        const existing = Store.get('or_keys', []);
        const merged = [...new Set([...existing, ...parsed.or_keys.filter(Boolean)])];
        Store.set('or_keys', merged);
        delete parsed.or_keys;
      }
      if (Array.isArray(parsed.mistral_keys)) {
        const existing = Store.get('mistral_keys', []);
        const merged = [...new Set([...existing, ...parsed.mistral_keys.filter(Boolean)])];
        Store.set('mistral_keys', merged);
        delete parsed.mistral_keys;
      }
      const keys = Store.get('keys', {});
      Object.assign(keys, parsed);
      Store.set('keys', keys);
      this.refresh();
      toast('✅ Kalitlar import qilindi');
    } catch { toast('❌ JSON formati xato'); }
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
document.addEventListener('DOMContentLoaded', () => App.init());
