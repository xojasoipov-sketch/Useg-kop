'use strict';
// Premium icons · Key vault + live test · GitHub harden

const Ic = {
  _svg(paths, size = 20) {
    return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  },
  home: (s) => Ic._svg('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>', s),
  brain: (s) => Ic._svg('<path d="M9.5 2a3.5 3.5 0 0 0-3.4 4.2A3.5 3.5 0 0 0 4 9.5V12a3.5 3.5 0 0 0 2 3.15V18a3 3 0 0 0 3 3h1"/><path d="M14.5 2a3.5 3.5 0 0 1 3.4 4.2A3.5 3.5 0 0 1 20 9.5V12a3.5 3.5 0 0 1-2 3.15V18a3 3 0 0 1-3 3h-1"/><path d="M9 8v4M15 8v4M12 6v12"/>', s),
  chat: (s) => Ic._svg('<path d="M21 12a8 8 0 0 1-8 8H7l-4 3V12a8 8 0 1 1 18 0z"/>', s),
  folder: (s) => Ic._svg('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>', s),
  agents: (s) => Ic._svg('<circle cx="9" cy="8" r="3"/><circle cx="16" cy="9" r="2.5"/><path d="M3 19c0-2.5 2.5-4.5 6-4.5s6 2 6 4.5"/><path d="M14 19c.3-1.5 1.5-3 4-3 1.5 0 2.5.5 3 1.5"/>', s),
  settings: (s) => Ic._svg('<circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>', s),
  key: (s) => Ic._svg('<path d="M21 2l-2 2m-7.5 7.5L21 2"/><circle cx="8" cy="16" r="5"/><path d="M10.5 13.5 14 10"/>', s),
  github: (s) => Ic._svg('<path d="M9 19c-4 1.5-4-2-6-2m12 5v-3.5a3.5 3.5 0 0 0-1-2.5c3.2-.4 6.5-1.6 6.5-7A5.4 5.4 0 0 0 19 4.8 5 5 0 0 0 18.8 1S17.5.7 14 3a13 13 0 0 0-8 0C2.5.7 1.2 1 1.2 1A5 5 0 0 0 1 4.8 5.4 5.4 0 0 0 2.5 9c0 5.4 3.3 6.6 6.5 7a3.5 3.5 0 0 0-1 2.5V22"/>', s),
  rocket: (s) => Ic._svg('<path d="M5 15c-1.5 1-2 3.5-2 5 1.5 0 4-.5 5-2"/><path d="M12 15l-3-3 6-9 3 3-6 9z"/><path d="M9 12H5l1-4 4 1"/><path d="M15 9V5l4 1-1 4"/>', s),
  heal: (s) => Ic._svg('<path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 11c0 5.5-7 10-7 10z"/><path d="M12 9v6M9 12h6"/>', s),
  phone: (s) => Ic._svg('<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>', s),
  plus: (s) => Ic._svg('<path d="M12 5v14M5 12h14"/>', s),
  spark: (s) => Ic._svg('<path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"/>', s),
  save: (s) => Ic._svg('<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>', s),
  restore: (s) => Ic._svg('<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>', s),
  sync: (s) => Ic._svg('<path d="M21 12a9 9 0 0 0-15-6.7L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 15 6.7L21 16"/><path d="M21 21v-5h-5"/>', s),
  send: (s) => Ic._svg('<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/>', s),
  check: (s) => Ic._svg('<path d="M20 6 9 17l-5-5"/>', s),
  x: (s) => Ic._svg('<path d="M18 6 6 18M6 6l12 12"/>', s),
  menu: (s) => Ic._svg('<path d="M4 6h16M4 12h16M4 18h16"/>', s),
  search: (s) => Ic._svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', s),
  code: (s) => Ic._svg('<path d="m8 9-4 3 4 3M16 9l4 3-4 3M13 5l-2 14"/>', s),
  file: (s) => Ic._svg('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>', s),
  chevron: (s) => Ic._svg('<path d="m9 18 6-6-6-6"/>', s),
  edit: (s) => Ic._svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>', s),
  zap: (s) => Ic._svg('<path d="M13 2 3 14h8l-1 8 10-12h-8l1-8z"/>', s),
  shield: (s) => Ic._svg('<path d="M12 2 4 5v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V5l-8-3z"/>', s),
  link: (s) => Ic._svg('<path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.1"/><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.1-1.1"/>', s),
  upload: (s) => Ic._svg('<path d="M12 16V5"/><path d="m8 9 4-4 4 4"/><path d="M4 19h16"/>', s),
};

function renderIcons(root = document) {
  root.querySelectorAll('[data-ic]').forEach(el => {
    const name = el.getAttribute('data-ic');
    const size = +(el.getAttribute('data-ic-size') || 20);
    if (Ic[name]) el.innerHTML = Ic[name](size);
  });
}

const KeyVault = {
  slots() { return Store.get('keys', {}); },
  set(partial) {
    const k = { ...this.slots(), ...partial };
    Store.set('keys', k);
    return k;
  },
  listProviders() {
    const k = this.slots();
    return [
      { id: 'or1', label: 'OpenRouter #1', type: 'openrouter', value: k.or1 || '', hint: 'sk-or-v1-...' },
      { id: 'or2', label: 'OpenRouter #2', type: 'openrouter', value: k.or2 || '', hint: 'sk-or-v1-...' },
      { id: 'or3', label: 'OpenRouter #3', type: 'openrouter', value: k.or3 || '', hint: 'sk-or-v1-...' },
      { id: 'or4', label: 'OpenRouter #4', type: 'openrouter', value: k.or4 || '', hint: 'sk-or-v1-...' },
      { id: 'groq', label: 'Groq', type: 'groq', value: k.groq || '', hint: 'gsk_...' },
      { id: 'github', label: 'GitHub PAT', type: 'github', value: k.github || '', hint: 'ghp_... yoki github_pat_...' },
      { id: 'supabaseUrl', label: 'Supabase URL', type: 'supabase_url', value: k.supabaseUrl || '', hint: 'https://xxx.supabase.co' },
      { id: 'supabaseAnon', label: 'Supabase anon key', type: 'supabase_key', value: k.supabaseAnon || '', hint: 'eyJ... yoki sb_publishable_...' },
    ];
  },
  open() {
    const list = this.listProviders();
    const fields = document.getElementById('connector-fields');
    if (!fields) return;
    fields.innerHTML = list.map(p => `
      <div class="key-row" data-key-id="${p.id}">
        <label class="sh-label">${p.label}</label>
        <div class="key-input-row">
          <input id="kv-${p.id}" class="sh-input key-input" type="${p.type.startsWith('supabase') || p.type === 'text' ? 'text' : 'password'}"
            placeholder="${p.hint}" value="${(p.value || '').replace(/"/g, '"')}">
          <button type="button" class="key-test-btn" onclick="KeyVault.testOne('${p.id}','${p.type}')" title="Tekshirish">${Ic.zap(16)}</button>
        </div>
        <div class="key-status" id="kv-st-${p.id}"></div>
      </div>`).join('') +
      `<button type="button" class="sh-btn" style="margin-top:8px;background:var(--bg3);color:var(--text)" onclick="KeyVault.testAll()">Barcha kalitlarni tekshirish</button>`;
    document.getElementById('connector-sheet-title').textContent = 'API kalitlar';
    Settings._conn = 'vault';
    Sheet.open('connector-sheet');
  },
  saveFromForm() {
    const k = { ...this.slots() };
    for (const p of this.listProviders()) {
      const el = document.getElementById('kv-' + p.id);
      if (!el) continue;
      const v = el.value.trim();
      if (v) k[p.id] = v; else delete k[p.id];
    }
    Store.set('keys', k);
    Settings.refresh?.();
    this.refreshStatusUI();
    toast('Kalitlar saqlandi');
    Sheet.close('connector-sheet');
    if (typeof SB !== 'undefined' && SB.ready()) {
      SB.test().then(r => {
        const el = document.getElementById('sb-status');
        if (el) { el.textContent = r.ok ? 'Ulangan' : 'Sozla'; el.className = r.ok ? 's-connected' : 's-val'; }
      });
    }
  },
  setStatus(id, ok, msg) {
    const el = document.getElementById('kv-st-' + id);
    if (!el) return;
    el.className = 'key-status ' + (ok === null ? '' : ok ? 'ok' : 'err');
    el.textContent = msg || '';
  },
  async testOne(id, type) {
    const el = document.getElementById('kv-' + id);
    const key = (el?.value || this.slots()[id] || '').trim();
    if (!key && !type.startsWith('supabase')) {
      this.setStatus(id, false, 'Kalit bo\'sh');
      return false;
    }
    this.setStatus(id, null, 'Tekshirilmoqda...');
    try {
      if (type === 'openrouter') {
        const res = await fetch('https://openrouter.ai/api/v1/models', { headers: { Authorization: `Bearer ${key}` } });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        this.setStatus(id, true, 'OpenRouter OK');
        return true;
      }
      if (type === 'groq') {
        const res = await fetch('https://api.groq.com/openai/v1/models', { headers: { Authorization: `Bearer ${key}` } });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        this.setStatus(id, true, 'Groq OK');
        return true;
      }
      if (type === 'github') {
        const res = await fetch('https://api.github.com/user', {
          headers: { Authorization: `Bearer ${key}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'OmniCode-SadiPrime' },
        });
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || 'HTTP ' + res.status); }
        const u = await res.json();
        this.setStatus(id, true, '@' + u.login + ' · OK');
        Store.set('gh_user', { login: u.login, name: u.name });
        return true;
      }
      if (type === 'supabase_url') {
        if (!key.startsWith('https://')) throw new Error('URL https:// bilan boshlansin');
        this.setStatus(id, true, 'URL OK');
        return true;
      }
      if (type === 'supabase_key') {
        // save temp and test via SB if available
        const url = (document.getElementById('kv-supabaseUrl')?.value || this.slots().supabaseUrl || '').trim();
        if (!url) throw new Error('Avval Supabase URL');
        const res = await fetch(url.replace(/\/$/, '') + '/rest/v1/', {
          headers: { apikey: key, Authorization: 'Bearer ' + key },
        });
        // 200 or 404 on root is fine; 401 bad key
        if (res.status === 401) throw new Error('Anon key yaroqsiz');
        this.setStatus(id, true, 'Anon key qabul qilindi');
        if (typeof SB !== 'undefined') {
          const prev = this.slots();
          Store.set('keys', { ...prev, supabaseUrl: url, supabaseAnon: key });
          const t = await SB.test();
          this.setStatus(id, t.ok, t.msg);
          return t.ok;
        }
        return true;
      }
      this.setStatus(id, true, 'OK');
      return true;
    } catch (e) {
      this.setStatus(id, false, e.message || 'Xato');
      return false;
    }
  },
  async testAll() {
    toast('Kalitlar tekshirilmoqda...');
    const results = [];
    for (const p of this.listProviders()) {
      results.push({ id: p.id, ok: await this.testOne(p.id, p.type) });
    }
    toast(results.filter(r => r.ok).length + '/' + results.length + ' ishlayapti');
    Settings.refresh?.();
  },
  refreshStatusUI() {
    const k = this.slots();
    const or = document.getElementById('or-status');
    const gh = document.getElementById('gh-status');
    const groq = document.getElementById('groq-status');
    const sb = document.getElementById('sb-status');
    if (or) {
      const n = [k.or1, k.or2, k.or3, k.or4, k.groq].filter(Boolean).length;
      or.textContent = n ? n + ' kalit' : 'Yo\'q';
      or.className = n ? 's-connected' : 's-val';
    }
    if (gh) {
      const u = Store.get('gh_user', null);
      gh.textContent = k.github ? (u?.login ? '@' + u.login : 'Token bor') : 'Yo\'q';
      gh.className = k.github ? 's-connected' : 's-val';
    }
    if (groq) {
      groq.textContent = k.groq ? 'Ulangan' : 'Yo\'q';
      groq.className = k.groq ? 's-connected' : 's-val';
    }
    if (sb) {
      const ok = !!(k.supabaseUrl && k.supabaseAnon);
      sb.textContent = ok ? 'Sozlangan' : 'Yo\'q';
      sb.className = ok ? 's-connected' : 's-val';
    }
  },
};

(function () {
  const _save = Settings.save.bind(Settings);
  Settings.save = function () {
    if (this._conn === 'vault') return KeyVault.saveFromForm();
    if (this._conn === 'all') return KeysPanel.saveAll();
    return _save();
  };
  const _ref = Settings.refresh.bind(Settings);
  Settings.refresh = function () { _ref(); KeyVault.refreshStatusUI(); };
})();

(function hardenGit() {
  Git.token = function () { return (Store.get('keys', {}).github || '').trim(); };
  Git.request = async function (path, method = 'GET', body = null) {
    const token = this.token();
    if (!token) throw new Error('GitHub token yo\'q. Sozlamalar → API kalitlar');
    const headers = {
      Authorization: 'Bearer ' + token,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'OmniCode-SadiPrime/1.0',
    };
    if (body) headers['Content-Type'] = 'application/json';
    const res = await fetch('https://api.github.com' + path, { method, headers, body: body ? JSON.stringify(body) : null });
    if (!res.ok) {
      let msg = 'GitHub ' + res.status;
      try {
        const e = await res.json();
        msg = e.message || msg;
        if (e.errors?.length) msg += ': ' + e.errors.map(x => x.message || x.code).join(', ');
      } catch {}
      if (res.status === 401) msg = 'Token yaroqsiz (401)';
      if (res.status === 403) msg = 'Ruxsat yo\'q — scope: repo (403)';
      if (res.status === 404) msg = 'Repo/fayl topilmadi (404)';
      throw new Error(msg);
    }
    if (res.status === 204) return null;
    return res.json();
  };
  Git.pushFile = async function (owner, repo, path, content, branch = 'main', message = null) {
    const sha = await this.getSHA(owner, repo, path, branch);
    const bytes = new TextEncoder().encode(content);
    let bin = '';
    bytes.forEach(b => { bin += String.fromCharCode(b); });
    const b64 = btoa(bin);
    return this.request('/repos/' + owner + '/' + repo + '/contents/' + path, 'PUT', {
      message: message || ('feat: update ' + path + ' via OmniCode'),
      content: b64,
      branch,
      ...(sha ? { sha } : {}),
    });
  };
  const _push = Deploy.push.bind(Deploy);
  Deploy.push = async function (projectId, owner, repo, branch) {
    if (!Git.token()) { toast('Avval GitHub token'); KeyVault.open(); return; }
    return _push(projectId, owner, repo, branch);
  };
})();

if (typeof KeysPanel !== 'undefined') KeysPanel.open = () => KeyVault.open();
document.addEventListener('DOMContentLoaded', () => renderIcons());
setTimeout(() => renderIcons(), 50);
console.log('✓ premium.js');
