'use strict';
// Premium icons · Unlimited key pools · JSON import · test (UZ)

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
  POOLS: [
    { id: 'or_pool', type: 'openrouter', label: 'OpenRouter', hint: 'sk-or-v1-...', jsonKey: 'or_keys' },
    { id: 'groq_pool', type: 'groq', label: 'Groq', hint: 'gsk_...', jsonKey: 'groq_keys' },
    { id: 'cerebras_pool', type: 'cerebras', label: 'Cerebras', hint: 'csk_...', jsonKey: 'cerebras_keys' },
    { id: 'mistral_pool', type: 'mistral', label: 'Mistral', hint: '...', jsonKey: 'mistral_keys' },
  ],

  slots() { return Store.get('keys', {}); },

  getPool(poolId) {
    const k = this.slots();
    const arr = k[poolId];
    if (Array.isArray(arr) && arr.length) return arr.filter(Boolean);
    // legacy single slots
    if (poolId === 'or_pool') {
      return [k.or1, k.or2, k.or3, k.or4, k.or5, k.or6, k.or7, k.or8].filter(Boolean);
    }
    if (poolId === 'groq_pool' && k.groq) return [k.groq];
    if (poolId === 'cerebras_pool' && k.cerebras) return [k.cerebras];
    if (poolId === 'mistral_pool' && k.mistral) return [k.mistral];
    return [];
  },

  setPool(poolId, keys) {
    const clean = (keys || []).map(String).map(s => s.trim()).filter(Boolean);
    // unique
    const seen = new Set();
    const uniq = [];
    for (const c of clean) {
      if (seen.has(c)) continue;
      seen.add(c);
      uniq.push(c);
    }
    const k = { ...this.slots(), [poolId]: uniq };
    // legacy sync (AIRouter compatibility)
    if (poolId === 'or_pool') {
      for (let i = 0; i < 8; i++) {
        if (uniq[i]) k['or' + (i + 1)] = uniq[i];
        else delete k['or' + (i + 1)];
      }
    }
    if (poolId === 'groq_pool') {
      if (uniq[0]) k.groq = uniq[0]; else delete k.groq;
    }
    if (poolId === 'cerebras_pool') {
      if (uniq[0]) k.cerebras = uniq[0]; else delete k.cerebras;
    }
    if (poolId === 'mistral_pool') {
      if (uniq[0]) k.mistral = uniq[0]; else delete k.mistral;
    }
    Store.set('keys', k);
    return uniq;
  },

  addKey(poolId, key) {
    const v = String(key || '').trim();
    if (!v) return this.getPool(poolId);
    const cur = this.getPool(poolId);
    if (cur.includes(v)) { toast('Allaqachon bor'); return cur; }
    return this.setPool(poolId, [...cur, v]);
  },

  removeKey(poolId, index) {
    const cur = this.getPool(poolId).slice();
    cur.splice(index, 1);
    return this.setPool(poolId, cur);
  },

  exampleJson() {
    return {
      groq_keys: ['gsk_...'],
      or_keys: ['sk-or-v1-...'],
      cerebras_keys: ['csk_...'],
      mistral_keys: ['...'],
      github: 'ghp_...',
      supabaseUrl: 'https://xxx.supabase.co',
      supabaseAnon: 'eyJ...',
    };
  },

  normalizeRaw(raw) {
    let s = (raw || '').trim();
    if (!s) throw new Error('JSON bo\'sh');
    if (s.includes('}\n{') || s.includes('}{')) {
      const parts = s.split(/\}\s*\{/).map((p, i, arr) => {
        if (i === 0) return p + '}';
        if (i === arr.length - 1) return '{' + p;
        return '{' + p + '}';
      });
      const merged = {};
      for (const p of parts) {
        try { Object.assign(merged, JSON.parse(p)); } catch {}
      }
      if (Object.keys(merged).length) return merged;
    }
    return JSON.parse(s);
  },

  importJson(raw) {
    let data = raw;
    if (typeof raw === 'string') {
      try { data = this.normalizeRaw(raw); } catch (e) {
        try { data = JSON.parse(raw); } catch (e2) {
          throw new Error('JSON noto\'g\'ri: ' + (e2.message || e.message));
        }
      }
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('JSON obyekt bo\'lishi kerak');
    }

    const asArr = (v) => {
      if (!v) return [];
      if (Array.isArray(v)) return v.map(String).map(s => s.trim()).filter(Boolean);
      return [String(v).trim()].filter(Boolean);
    };

    // merge with existing (append, not replace) — cheksiz
    const mergePool = (poolId, incoming) => {
      const cur = this.getPool(poolId);
      return this.setPool(poolId, [...cur, ...incoming]);
    };

    mergePool('or_pool', asArr(data.or_keys || data.openrouter_keys || data.openrouter || data.or));
    mergePool('groq_pool', asArr(data.groq_keys || data.groq));
    mergePool('cerebras_pool', asArr(data.cerebras_keys || data.cerebras));
    mergePool('mistral_pool', asArr(data.mistral_keys || data.mistral));

    const k = { ...this.slots() };
    if (data.github || data.github_token) k.github = String(data.github || data.github_token).trim();
    if (data.supabaseUrl || data.supabase_url) k.supabaseUrl = String(data.supabaseUrl || data.supabase_url).trim();
    if (data.supabaseAnon || data.supabase_anon || data.supabase_key) {
      k.supabaseAnon = String(data.supabaseAnon || data.supabase_anon || data.supabase_key).trim();
    }
    Store.set('keys', k);
    Store.set('keys_last_test', null);
    return k;
  },

  exportJson() {
    const k = this.slots();
    return {
      or_keys: this.getPool('or_pool'),
      groq_keys: this.getPool('groq_pool'),
      cerebras_keys: this.getPool('cerebras_pool'),
      mistral_keys: this.getPool('mistral_pool'),
      github: k.github || '',
      supabaseUrl: k.supabaseUrl || '',
      supabaseAnon: k.supabaseAnon || '',
    };
  },

  open() {
    const fields = document.getElementById('connector-fields');
    if (!fields) return;
    const last = Store.get('keys_last_test', null);
    const k = this.slots();

    const poolHtml = this.POOLS.map(p => {
      const keys = this.getPool(p.id);
      const rows = keys.map((key, i) => `
        <div class="key-input-row" data-pool="${p.id}" data-idx="${i}">
          <input class="sh-input key-input" type="password" value="" data-pool-val="${p.id}-${i}" placeholder="${p.hint}">
          <button type="button" class="key-test-btn" onclick="KeyVault.testPoolKey('${p.id}',${i},'${p.type}')" title="Test">${Ic.zap(16)}</button>
          <button type="button" class="key-test-btn" style="color:var(--accent)" onclick="KeyVault.uiRemove('${p.id}',${i})" title="O'chirish">${Ic.x(16)}</button>
        </div>
        <div class="key-status" id="kv-st-${p.id}-${i}">Saqlangan · ${this.mask(key)}</div>
      `).join('');

      return `
        <div class="kv-pool" data-pool-block="${p.id}">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 20px 4px">
            <label class="sh-label" style="padding:0;margin:0">${p.label} <span style="color:var(--text3);font-weight:600">(${keys.length})</span></label>
            <button type="button" class="chip-mini" style="border:1px solid var(--border)" onclick="KeyVault.uiAdd('${p.id}')">+ Qo'shish</button>
          </div>
          ${rows || '<div style="padding:4px 20px 8px;font-size:12px;color:var(--text3)">Hali kalit yo\'q</div>'}
          <div class="key-input-row" id="kv-add-${p.id}" style="display:none">
            <input id="kv-new-${p.id}" class="sh-input key-input" type="password" placeholder="${p.hint}">
            <button type="button" class="key-test-btn" style="color:var(--green)" onclick="KeyVault.uiCommitAdd('${p.id}')" title="Saqlash">${Ic.check(16)}</button>
          </div>
        </div>
      `;
    }).join('');

    fields.innerHTML = `
      <label class="sh-label">Barcha AI kalitlar — bitta JSON (cheksiz)</label>
      <textarea id="kv-json" class="sh-input" rows="5" style="height:100px;font-family:monospace;font-size:11px" placeholder='{"or_keys":["sk-or-v1-..."],"groq_keys":["gsk_..."]}'></textarea>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 20px 8px">
        <button type="button" class="sh-btn" style="margin:0;padding:12px" onclick="KeyVault.importAndTest()">JSON yukla + test</button>
        <button type="button" class="sh-btn" style="margin:0;background:var(--bg3);color:var(--text);padding:12px" onclick="KeyVault.importFromTextarea()">Faqat yukla</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 20px 12px">
        <button type="button" class="sh-btn" style="margin:0;background:var(--bg3);color:var(--text);padding:10px;font-size:12px" onclick="KeyVault.pasteExample()">Namuna</button>
        <button type="button" class="sh-btn" style="margin:0;background:var(--bg3);color:var(--text);padding:10px;font-size:12px" onclick="KeyVault.copyExport()">Eksport</button>
      </div>
      <div id="kv-test-report" style="padding:0 20px 12px;font-size:12px;line-height:1.5">${last ? this.formatReport(last) : ''}</div>
      ${poolHtml}
      <label class="sh-label">GitHub PAT</label>
      <div class="key-input-row">
        <input id="kv-github" class="sh-input key-input" type="password" placeholder="ghp_...">
        <button type="button" class="key-test-btn" onclick="KeyVault.testSingle('github','github')">${Ic.zap(16)}</button>
      </div>
      <div class="key-status" id="kv-st-github">${k.github ? 'Saqlangan · ' + this.mask(k.github) : ''}</div>
      <label class="sh-label">Supabase URL</label>
      <div class="key-input-row">
        <input id="kv-supabaseUrl" class="sh-input key-input" type="text" placeholder="https://xxx.supabase.co">
      </div>
      <label class="sh-label">Supabase anon</label>
      <div class="key-input-row">
        <input id="kv-supabaseAnon" class="sh-input key-input" type="password" placeholder="eyJ...">
        <button type="button" class="key-test-btn" onclick="KeyVault.testSingle('supabaseAnon','supabase_key')">${Ic.zap(16)}</button>
      </div>
      <div class="key-status" id="kv-st-supabaseAnon"></div>
      <button type="button" class="sh-btn" style="margin-top:8px;background:var(--bg3);color:var(--text)" onclick="KeyVault.testAllPools()">Barcha kalitlarni test</button>
    `;

    // fill values safely
    this.POOLS.forEach(p => {
      this.getPool(p.id).forEach((key, i) => {
        const el = fields.querySelector(`[data-pool-val="${p.id}-${i}"]`);
        if (el) el.value = key;
      });
    });
    if (k.github) {
      const g = document.getElementById('kv-github');
      if (g) g.value = k.github;
    }
    if (k.supabaseUrl) {
      const u = document.getElementById('kv-supabaseUrl');
      if (u) u.value = k.supabaseUrl;
    }
    if (k.supabaseAnon) {
      const a = document.getElementById('kv-supabaseAnon');
      if (a) a.value = k.supabaseAnon;
    }

    document.getElementById('connector-sheet-title').textContent = 'API kalitlar (cheksiz)';
    Settings._conn = 'vault';
    Sheet.open('connector-sheet');
  },

  uiAdd(poolId) {
    const row = document.getElementById('kv-add-' + poolId);
    if (row) row.style.display = 'flex';
    const inp = document.getElementById('kv-new-' + poolId);
    if (inp) { inp.value = ''; inp.focus(); }
  },

  uiCommitAdd(poolId) {
    const inp = document.getElementById('kv-new-' + poolId);
    const v = (inp?.value || '').trim();
    if (!v) { toast('Kalit yozing'); return; }
    this.addKey(poolId, v);
    toast('Qo\'shildi');
    this.open();
  },

  uiRemove(poolId, index) {
    this.removeKey(poolId, index);
    toast('O\'chirildi');
    this.open();
  },

  pasteExample() {
    const el = document.getElementById('kv-json');
    if (el) el.value = JSON.stringify(this.exampleJson(), null, 2);
  },

  copyExport() {
    const j = JSON.stringify(this.exportJson(), null, 2);
    navigator.clipboard.writeText(j).then(() => toast('JSON nusxa')).catch(() => {
      const el = document.getElementById('kv-json');
      if (el) el.value = j;
      toast('JSON maydonga');
    });
  },

  importFromTextarea() {
    const el = document.getElementById('kv-json');
    const raw = (el?.value || '').trim();
    if (!raw) { toast('JSON joylang'); return; }
    try {
      this.importJson(raw);
      const n = this.POOLS.reduce((s, p) => s + this.getPool(p.id).length, 0);
      toast(n + ' kalit hovuzda');
      this.open();
      this.refreshStatusUI();
    } catch (e) {
      toast(e.message || 'Import xato');
    }
  },

  async importAndTest() {
    const el = document.getElementById('kv-json');
    const raw = (el?.value || '').trim();
    if (!raw) { toast('JSON joylang'); return; }
    try {
      this.importJson(raw);
      toast('Yuklandi — test...');
      this.open();
      await this.testAllPools();
    } catch (e) {
      toast(e.message || 'Import xato');
    }
  },

  formatReport(rep) {
    if (!rep) return '';
    const ok = rep.working || [];
    const bad = rep.failed || [];
    return `<div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:10px">
      <div style="font-weight:800;margin-bottom:6px">Test natija</div>
      <div style="color:var(--green)">Ishlaydi (${ok.length}): ${ok.map(x => x.label).join(', ') || '—'}</div>
      <div style="color:var(--accent);margin-top:4px">Ishlamaydi (${bad.length}): ${bad.map(x => x.label + (x.error ? ' — ' + x.error : '')).join('; ') || '—'}</div>
    </div>`;
  },

  saveFromForm() {
    // pool inputs → pools
    this.POOLS.forEach(p => {
      const keys = this.getPool(p.id).map((old, i) => {
        const el = document.querySelector(`[data-pool-val="${p.id}-${i}"]`);
        return (el?.value || old || '').trim();
      }).filter(Boolean);
      this.setPool(p.id, keys);
    });
    const k = { ...this.slots() };
    const gh = document.getElementById('kv-github')?.value.trim();
    const su = document.getElementById('kv-supabaseUrl')?.value.trim();
    const sa = document.getElementById('kv-supabaseAnon')?.value.trim();
    if (gh) k.github = gh; else delete k.github;
    if (su) k.supabaseUrl = su; else delete k.supabaseUrl;
    if (sa) k.supabaseAnon = sa; else delete k.supabaseAnon;
    Store.set('keys', k);
    this.refreshStatusUI();
    toast('Kalitlar saqlandi');
    Sheet.close('connector-sheet');
  },

  setStatus(id, ok, msg) {
    const el = document.getElementById('kv-st-' + id);
    if (!el) return;
    el.className = 'key-status ' + (ok === null ? '' : ok ? 'ok' : 'err');
    el.textContent = msg || '';
  },

  mask(key) {
    if (!key || key.length < 12) return '***';
    return key.slice(0, 6) + '…' + key.slice(-4);
  },

  async probe(type, key) {
    if (!key) throw new Error('bo\'sh');
    if (type === 'openrouter') {
      const res = await fetch('https://openrouter.ai/api/v1/models', { headers: { Authorization: 'Bearer ' + key } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return 'OpenRouter OK';
    }
    if (type === 'groq') {
      const res = await fetch('https://api.groq.com/openai/v1/models', { headers: { Authorization: 'Bearer ' + key } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return 'Groq OK';
    }
    if (type === 'cerebras') {
      const res = await fetch('https://api.cerebras.ai/v1/models', { headers: { Authorization: 'Bearer ' + key } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return 'Cerebras OK';
    }
    if (type === 'mistral') {
      const res = await fetch('https://api.mistral.ai/v1/models', { headers: { Authorization: 'Bearer ' + key } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return 'Mistral OK';
    }
    if (type === 'github') {
      const res = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: 'Bearer ' + key,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'OmniCode-SadiPrime',
        },
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || 'HTTP ' + res.status);
      }
      const u = await res.json();
      Store.set('gh_user', { login: u.login, name: u.name });
      return '@' + u.login;
    }
    if (type === 'supabase_url') {
      if (!key.startsWith('https://')) throw new Error('https:// kerak');
      return 'URL OK';
    }
    if (type === 'supabase_key') {
      const url = (this.slots().supabaseUrl || document.getElementById('kv-supabaseUrl')?.value || '').replace(/\/$/, '');
      if (!url) throw new Error('URL yo\'q');
      const res = await fetch(url + '/rest/v1/', { headers: { apikey: key, Authorization: 'Bearer ' + key } });
      if (res.status === 401) throw new Error('401');
      return 'Anon OK';
    }
    return 'OK';
  },

  async testPoolKey(poolId, index, type) {
    const el = document.querySelector(`[data-pool-val="${poolId}-${index}"]`);
    const key = (el?.value || this.getPool(poolId)[index] || '').trim();
    const sid = poolId + '-' + index;
    if (!key) { this.setStatus(sid, false, 'Bo\'sh'); return; }
    this.setStatus(sid, null, '...');
    try {
      const msg = await this.probe(type, key);
      this.setStatus(sid, true, msg);
      // update stored if edited
      const cur = this.getPool(poolId).slice();
      cur[index] = key;
      this.setPool(poolId, cur);
    } catch (e) {
      this.setStatus(sid, false, e.message || 'Xato');
    }
  },

  async testSingle(id, type) {
    const el = document.getElementById('kv-' + id);
    const key = (el?.value || this.slots()[id] || '').trim();
    if (!key) { this.setStatus(id, false, 'Bo\'sh'); return; }
    this.setStatus(id, null, '...');
    try {
      const msg = await this.probe(type, key);
      this.setStatus(id, true, msg);
      const k = { ...this.slots(), [id]: key };
      Store.set('keys', k);
    } catch (e) {
      this.setStatus(id, false, e.message || 'Xato');
    }
  },

  async testAllPools() {
    toast('Barcha kalitlar tekshirilmoqda...');
    // save form first
    this.POOLS.forEach(p => {
      const keys = this.getPool(p.id).map((old, i) => {
        const el = document.querySelector(`[data-pool-val="${p.id}-${i}"]`);
        return (el?.value || old || '').trim();
      }).filter(Boolean);
      this.setPool(p.id, keys);
    });
    const gh = document.getElementById('kv-github')?.value.trim();
    const su = document.getElementById('kv-supabaseUrl')?.value.trim();
    const sa = document.getElementById('kv-supabaseAnon')?.value.trim();
    if (gh || su || sa) {
      const k = { ...this.slots() };
      if (gh) k.github = gh;
      if (su) k.supabaseUrl = su;
      if (sa) k.supabaseAnon = sa;
      Store.set('keys', k);
    }

    const working = [];
    const failed = [];
    const jobs = [];

    this.POOLS.forEach(p => {
      this.getPool(p.id).forEach((key, i) => {
        jobs.push({ type: p.type, label: p.label + '#' + (i + 1), key, poolId: p.id, index: i });
      });
    });
    const k = this.slots();
    if (k.github) jobs.push({ type: 'github', label: 'GitHub', key: k.github, id: 'github' });
    if (k.supabaseUrl) jobs.push({ type: 'supabase_url', label: 'SB URL', key: k.supabaseUrl });
    if (k.supabaseAnon) jobs.push({ type: 'supabase_key', label: 'SB anon', key: k.supabaseAnon, id: 'supabaseAnon' });

    for (const j of jobs) {
      try {
        const msg = await this.probe(j.type, j.key);
        working.push({ label: j.label, type: j.type, key: j.key, mask: this.mask(j.key), msg });
        if (j.poolId != null) this.setStatus(j.poolId + '-' + j.index, true, msg);
        if (j.id) this.setStatus(j.id, true, msg);
      } catch (e) {
        failed.push({ label: j.label, type: j.type, key: j.key, mask: this.mask(j.key), error: e.message || 'xato' });
        if (j.poolId != null) this.setStatus(j.poolId + '-' + j.index, false, e.message || 'xato');
        if (j.id) this.setStatus(j.id, false, e.message || 'xato');
      }
    }

    // keep only working keys in pools (optional — user may want to keep failed too)
    // We keep all, but mark — only rotate working for AI
    const next = { ...this.slots() };
    this.POOLS.forEach(p => {
      const okKeys = working.filter(w => w.type === p.type).map(w => w.key);
      if (okKeys.length) this.setPool(p.id, okKeys);
      // if none ok, leave as-is so user can fix
    });

    const report = {
      at: Date.now(),
      working: working.map(w => ({ label: w.label, type: w.type, mask: w.mask, msg: w.msg })),
      failed: failed.map(f => ({ label: f.label, type: f.type, mask: f.mask, error: f.error })),
    };
    Store.set('keys_last_test', report);
    const box = document.getElementById('kv-test-report');
    if (box) box.innerHTML = this.formatReport(report);
    toast('Ishlaydi: ' + working.length + ' · Ishlamaydi: ' + failed.length);
    this.refreshStatusUI();
    return report;
  },

  async testAll() { return this.testAllPools(); },

  refreshStatusUI() {
    const last = Store.get('keys_last_test', null);
    const or = document.getElementById('or-status');
    const gh = document.getElementById('gh-status');
    const sb = document.getElementById('sb-status');
    const n = this.POOLS.reduce((s, p) => s + this.getPool(p.id).length, 0);
    if (or) {
      or.textContent = n ? n + ' kalit' : 'Yo\'q';
      or.className = n ? 's-connected' : 's-val';
    }
    const k = this.slots();
    if (gh) {
      const u = Store.get('gh_user', null);
      gh.textContent = k.github ? (u?.login ? '@' + u.login : 'Token bor') : 'Yo\'q';
      gh.className = k.github ? 's-connected' : 's-val';
    }
    if (sb) {
      const ok = !!(k.supabaseUrl && k.supabaseAnon);
      sb.textContent = ok ? 'Sozlangan' : 'Yo\'q';
      sb.className = ok ? 's-connected' : 's-val';
    }
    const pct = document.getElementById('usage-pct');
    if (pct) pct.textContent = n ? String(n) : '—';
  },
};

(function patchKeyRotation() {
  if (typeof AIRouter === 'undefined') return;
  AIRouter.openRouterKeys = function () {
    return KeyVault.getPool('or_pool');
  };
})();

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
      try { const e = await res.json(); msg = e.message || msg; } catch {}
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
console.log('✓ premium.js — unlimited keys');
