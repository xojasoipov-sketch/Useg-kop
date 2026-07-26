'use strict';
// OmniCode Supabase — premium cloud memory & project sync
// Tables: oc_sessions, oc_projects, oc_files, oc_chat, oc_snapshots

const SB = {
  cfg() {
    const k = Store.get('keys', {});
    return {
      url: String(k.supabaseUrl || '').replace(/\/$/, '').trim(),
      key: String(k.supabaseAnon || k.supabaseKey || '').trim(),
      userId: String(
        k.ownerId ||
        window.Telegram?.WebApp?.initDataUnsafe?.user?.id ||
        Store.get('oc_uid', null) ||
        ''
      ),
    };
  },

  ensureUserId() {
    let id = this.cfg().userId;
    if (!id) {
      id = 'u_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      const keys = Store.get('keys', {});
      keys.ownerId = id;
      Store.set('keys', keys);
      Store.set('oc_uid', id);
    }
    return id;
  },

  ready() {
    const c = this.cfg();
    return !!(c.url && c.key);
  },

  headers(extra = {}) {
    const { key } = this.cfg();
    return {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...extra,
    };
  },

  async req(path, opts = {}) {
    if (!this.ready()) throw new Error('Supabase sozlanmagan (URL + anon key)');
    const { url } = this.cfg();
    const res = await fetch(`${url}/rest/v1/${path}`, {
      ...opts,
      headers: { ...this.headers(opts.prefer ? { Prefer: opts.prefer } : {}), ...(opts.headers || {}) },
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      let msg = `Supabase ${res.status}`;
      try { msg = JSON.parse(t).message || JSON.parse(t).error || msg; } catch { if (t) msg = t.slice(0, 120); }
      throw new Error(msg);
    }
    if (res.status === 204) return null;
    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text);
  },

  /** Live connection + table probe */
  async test() {
    if (!this.ready()) return { ok: false, msg: 'URL yoki anon key yo\'q' };
    try {
      // lightweight: select 0 rows from sessions (table must exist)
      await this.req('oc_sessions?select=user_id&limit=1');
      return { ok: true, msg: 'Supabase ulandi · jadvallar OK' };
    } catch (e) {
      // try health via auth settings or just root
      try {
        const { url, key } = this.cfg();
        const r = await fetch(`${url}/auth/v1/health`, { headers: { apikey: key } });
        if (r.ok) return { ok: false, msg: 'Ulandi, lekin SQL jadvallarni yarating (schema.sql)' };
      } catch {}
      return { ok: false, msg: e.message };
    }
  },

  // ── Session memory ───────────────────────────────────────────
  async saveSession({ goal, summary, projectId } = {}) {
    const user_id = this.ensureUserId();
    const row = {
      user_id,
      goal: goal ?? SelfImport.getLocalState().goal ?? '',
      summary: summary ?? SelfImport.getLocalState().summary ?? '',
      project_id: projectId || State.projectId || null,
      updated_at: new Date().toISOString(),
    };
    SelfImport.setLocalState({ goal: row.goal, summary: row.summary });
    if (!this.ready()) return row;
    return this.req('oc_sessions', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=representation',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(row),
    });
  },

  async loadSession() {
    const local = SelfImport.getLocalState();
    if (!this.ready()) return local;
    const user_id = this.ensureUserId();
    const rows = await this.req(
      `oc_sessions?user_id=eq.${encodeURIComponent(user_id)}&select=*&order=updated_at.desc&limit=1`
    );
    if (rows?.[0]) {
      const st = { goal: rows[0].goal || '', summary: rows[0].summary || '', updated: Date.parse(rows[0].updated_at) || Date.now() };
      SelfImport.setLocalState(st);
      return st;
    }
    return local;
  },

  // ── Projects sync ────────────────────────────────────────────
  async pushProject(projectId) {
    if (!this.ready()) throw new Error('Supabase yo\'q');
    const user_id = this.ensureUserId();
    const p = PM.get(projectId);
    if (!p) throw new Error('Loyiha topilmadi');
    const files = {};
    for (const path of FS.index(projectId)) files[path] = FS.read(projectId, path);

    await this.req('oc_projects', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        id: projectId,
        user_id,
        name: p.name,
        template: p.template || 'blank',
        github: p.github || null,
        updated_at: new Date().toISOString(),
      }),
    });

    // replace files for project
    await this.req(`oc_files?project_id=eq.${encodeURIComponent(projectId)}&user_id=eq.${encodeURIComponent(user_id)}`, {
      method: 'DELETE',
      headers: { Prefer: 'return=minimal' },
    }).catch(() => {});

    const rows = Object.entries(files).map(([path, content]) => ({
      user_id,
      project_id: projectId,
      path,
      content,
      updated_at: new Date().toISOString(),
    }));
    if (rows.length) {
      await this.req('oc_files', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(rows),
      });
    }
    return { files: rows.length };
  },

  async pullProjects() {
    if (!this.ready()) throw new Error('Supabase yo\'q');
    const user_id = this.ensureUserId();
    const projects = await this.req(`oc_projects?user_id=eq.${encodeURIComponent(user_id)}&select=*&order=updated_at.desc`);
    if (!projects?.length) return [];

    for (const p of projects) {
      const existing = PM.get(p.id);
      if (!existing) {
        const list = PM.list();
        list.unshift({ id: p.id, name: p.name, template: p.template || 'blank', created: Date.now(), github: p.github || null });
        Store.set('projects', list);
      } else {
        PM.update(p.id, { name: p.name, github: p.github || existing.github });
      }
      const files = await this.req(
        `oc_files?user_id=eq.${encodeURIComponent(user_id)}&project_id=eq.${encodeURIComponent(p.id)}&select=path,content`
      );
      for (const f of files || []) FS.write(p.id, f.path, f.content || '');
    }
    Projects.render?.();
    Home.refresh?.();
    return projects;
  },

  // ── Chat history ─────────────────────────────────────────────
  async saveChat() {
    if (!this.ready()) return;
    const user_id = this.ensureUserId();
    const history = State.chatHistory.slice(-40);
    await this.req('oc_chat', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        user_id,
        project_id: State.projectId || null,
        messages: history,
        updated_at: new Date().toISOString(),
      }),
    });
  },

  async loadChat() {
    if (!this.ready()) return State.chatHistory;
    const user_id = this.ensureUserId();
    let q = `oc_chat?user_id=eq.${encodeURIComponent(user_id)}&order=updated_at.desc&limit=1`;
    if (State.projectId) q = `oc_chat?user_id=eq.${encodeURIComponent(user_id)}&project_id=eq.${encodeURIComponent(State.projectId)}&order=updated_at.desc&limit=1`;
    const rows = await this.req(q);
    if (rows?.[0]?.messages?.length) {
      State.chatHistory = rows[0].messages;
      return State.chatHistory;
    }
    return State.chatHistory;
  },

  // ── Full snapshot ────────────────────────────────────────────
  async snapshot() {
    const user_id = this.ensureUserId();
    const payload = await SelfImport.snapshotApp();
    if (!this.ready()) return payload;
    await this.req('oc_snapshots', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        user_id,
        project_id: State.projectId || null,
        payload,
        created_at: new Date().toISOString(),
      }),
    });
    if (State.projectId) await this.pushProject(State.projectId).catch(() => {});
    await this.saveSession({}).catch(() => {});
    await this.saveChat().catch(() => {});
    return payload;
  },

  async syncAll() {
    Activity?.showStatus?.('Supabase sync...');
    try {
      await this.loadSession();
      await this.pullProjects();
      await this.loadChat();
      toast('Cloud sync tayyor');
    } catch (e) {
      toast('Sync: ' + e.message);
    } finally {
      Activity?.hideStatus?.();
    }
  },
};

// Wire SelfImport to SB
(function bridgeSelfImport() {
  if (typeof SelfImport === 'undefined') return;
  const _save = SelfImport.saveState.bind(SelfImport);
  SelfImport.saveState = async function (partial) {
    const next = await _save(partial);
    if (SB.ready()) {
      try { await SB.saveSession(partial); } catch (e) { console.warn(e); }
    }
    return next;
  };
  const _snap = SelfImport.snapshotApp.bind(SelfImport);
  SelfImport.snapshotApp = async function () {
    const p = await _snap();
    if (SB.ready()) {
      try { await SB.snapshot(); } catch (e) { console.warn(e); }
    }
    return p;
  };
  SelfImport.loadState = async function () {
    return SB.loadSession();
  };
})();

// Auto-load on boot
setTimeout(() => {
  if (SB.ready()) SB.loadSession().catch(() => {});
}, 800);

console.log('✓ supabase.js');
