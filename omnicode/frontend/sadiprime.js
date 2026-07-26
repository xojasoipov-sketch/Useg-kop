'use strict';
// ═══════════════════════════════════════════════════════════════
//  SadiPrime AI — private master brain for OmniCode owner
//  Claude Code / vibe-coding style · all keys · SelfImport · Skills
// ═══════════════════════════════════════════════════════════════

const SKILLS = {
  'plan-first': {
    id: 'plan-first',
    name: 'Plan → Execute',
    desc: 'Katta vazifada avval reja, keyin kod',
    body: `Before coding multi-file work:
1) List files to touch
2) Main change per file
3) Risks
Then implement with WRITE_FILE. Keep plan short.`
  },
  'spec-driven': {
    id: 'spec-driven',
    name: 'Spec-driven',
    desc: 'Interfeys/spec bilan ishlash',
    body: `Write code that satisfies the given interface or acceptance criteria.
Prefer types/contracts. Fail fast on bad input.`
  },
  'match-style': {
    id: 'match-style',
    name: 'Match surrounding style',
    desc: 'Mavjud kod uslubiga moslash',
    body: `Write code that reads like the surrounding code: match naming, comment density, and idiom. No drive-by refactors.`
  },
  'tdd-loop': {
    id: 'tdd-loop',
    name: 'TDD loop',
    desc: 'Test → fail → implement → pass',
    body: `When tests matter: write/adjust test first, then minimal implementation until green.`
  },
  'git-auto': {
    id: 'git-auto',
    name: 'Git auto-push',
    desc: 'O\'zgarishlarni GitHubga yuborish',
    body: `After applying file writes, if project has github linked and user asked auto-push or said "push", call auto push. Commit messages: short imperative.`
  },
  'self-rebuild': {
    id: 'self-rebuild',
    name: 'Self rebuild',
    desc: '0 dan o\'zini qayta qurish',
    body: `You may rewrite OmniCode frontend modules (app.js, features.js, sadiprime.js, index.html) via WRITE_FILE when user asks rebuild/self-update. Prefer incremental safe patches unless full rebuild requested.`
  },
  'session-memory': {
    id: 'session-memory',
    name: 'Session memory',
    desc: 'Sessiya holatini saqlash',
    body: `After significant steps: update GOAL and CURRENT_STATE summaries. On new session, load prior state and continue.`
  },
  'debug': {
    id: 'debug',
    name: 'Debug',
    desc: 'Xatolarni topish va tuzatish',
    body: `Reproduce → isolate → fix minimal → verify. Explain root cause briefly.`
  }
};

const SadiPrime = {
  autoPush: Store.get('sp_auto_push', false),
  activeSkills: Store.get('sp_skills', ['plan-first', 'match-style', 'git-auto', 'session-memory', 'self-rebuild']),

  brain() {
    const skillsText = this.activeSkills
      .map(id => SKILLS[id] ? `### ${SKILLS[id].name}\n${SKILLS[id].body}` : '')
      .filter(Boolean)
      .join('\n\n');

    const state = SelfImport.getLocalState();
    const goal = state.goal || 'Help owner ship products with OmniCode';
    const summary = state.summary || 'New session';

    return `You are **SadiPrime** — the private master AI of OmniCode for the sole owner.
You think and act like a senior vibe-coding agent (Claude Code / Cursor style): decisive, minimal ceremony, production-ready code.

## Identity
- Owner-only assistant. Prefer Uzbek when user writes Uzbek; else match user language.
- You orchestrate: file system, agents, GitHub push, SMM, SelfHeal, SelfImport.
- Use ALL configured providers via the app router (OpenRouter keys, Groq, fallbacks).

## Tools protocol (mandatory for code)
Create/update files ONLY with:
<WRITE_FILE path="relative/path">
full file content
</WRITE_FILE>
Multiple files allowed. Always complete files, not partial patches unless tiny fix.

Optional tool tags the host may execute:
<AUTO_PUSH/> — push active project to linked GitHub after apply
<SAVE_STATE goal="..." summary="..."/> — persist session memory
<RUN_AGENTS list="planner,coder,reviewer"/> — multi-agent pipeline hint

## Decision style
- Small tasks: code immediately.
- 5+ files or architecture: short plan first, then code.
- Match existing style; no unnecessary comments.
- Prefer working code over essays.

## Skills (apply when relevant)
${skillsText}

## Session
GOAL: ${goal}
STATE: ${summary}

## Project
Active project and file context are appended by the host.`;
  },

  parseMeta(text) {
    const meta = { autoPush: false, goal: null, summary: null, agents: null };
    if (/<AUTO_PUSH\s*\/>/i.test(text)) meta.autoPush = true;
    const st = text.match(/<SAVE_STATE\s+goal="([^"]*)"\s+summary="([^"]*)"\s*\/>/i);
    if (st) { meta.goal = st[1]; meta.summary = st[2]; }
    const ag = text.match(/<RUN_AGENTS\s+list="([^"]+)"\s*\/>/i);
    if (ag) meta.agents = ag[1].split(',').map(s => s.trim()).filter(Boolean);
    return meta;
  },

  stripMeta(text) {
    return text
      .replace(/<AUTO_PUSH\s*\/>/gi, '')
      .replace(/<SAVE_STATE\s+[^>]*\/>/gi, '')
      .replace(/<RUN_AGENTS\s+[^>]*\/>/gi, '')
      .trim();
  },

  async run(userText) {
    App.nav('ai');
    const msg = (userText || '').trim();
    if (!msg || AI.busy) return;

    const inp = document.getElementById('chat-input');
    if (inp) { inp.value = ''; inp.style.height = ''; }

    AI.appendBubble('user', msg, false);
    const resolved = await AI.resolveRefs(msg);
    State.chatHistory.push({ role: 'user', content: resolved });

    AI.busy = true;
    Activity.showStatus('SadiPrime ishlayapti...');
    Activity.setAgents(['SadiPrime']);

    const projectCtx = State.projectId ? FS.context(State.projectId) : '';
    const project = State.projectId ? PM.get(State.projectId) : null;

    const system = this.brain() +
      `\n\nACTIVE PROJECT: ${project ? project.name : 'None'}` +
      `\nAUTO_PUSH setting: ${this.autoPush ? 'ON' : 'OFF'}` +
      projectCtx;

    const messages = [
      { role: 'system', content: system },
      ...State.chatHistory.slice(-20),
    ];

    try {
      const reply = await AIRouter.call(messages);
      Activity.hideStatus();

      const meta = this.parseMeta(reply);
      const cleanForHistory = reply;
      const writes = FS.parseWrites(reply);

      if (meta.goal || meta.summary) {
        await SelfImport.saveState({
          goal: meta.goal || undefined,
          summary: meta.summary || undefined,
        });
      }

      if (meta.agents && meta.agents.length) {
        Activity.setAgents(['SadiPrime', ...meta.agents]);
      }

      if (writes.length) {
        State.pendingWrites = writes;
        Activity.recordWrites(writes);
        AI.appendBubble('ai', this.stripMeta(FS.stripCommands(reply)) + '\n\n_(fayllar tayyor)_', true);
        toast(`SadiPrime: ${writes.length} fayl`);

        // Optional auto-apply + push for power mode
        if (this.autoPush || meta.autoPush) {
          // still show diff first unless user enabled force auto
          if (Store.get('sp_force_apply', false)) {
            DiffView.applyAll();
            await this.pushIfLinked();
          } else if (meta.autoPush || this.autoPush) {
            AI.appendBubble('ai', '🐙 Auto-push yoqilgan — **Apply** qiling, keyin push bo\'ladi yoki /push yozing.', false);
          }
        }
      } else {
        AI.appendBubble('ai', this.stripMeta(reply), false);
      }

      State.chatHistory.push({ role: 'assistant', content: cleanForHistory });

      // slash helpers
      if (/\/push/i.test(msg)) await this.pushIfLinked();
      if (/\/rebuild|\/self/i.test(msg)) {
        await SelfImport.snapshotApp();
        toast('SelfImport: snapshot saqlandi');
      }
    } catch (e) {
      Activity.hideStatus();
      AI.appendBubble('ai', `❌ SadiPrime: ${e.message}\n\nKalitlar: Sozlamalar → API Kalitlar`, false);
    } finally {
      AI.busy = false;
      Activity.hideStatus();
    }
  },

  async pushIfLinked() {
    const projectId = State.projectId;
    if (!projectId) { toast('Loyiha tanlang'); return; }
    const p = PM.get(projectId);
    if (!p?.github) {
      Sheet.open('github-deploy-sheet');
      toast('GitHub bog\'lang');
      return;
    }
    Activity.showStatus('GitHub push...');
    try {
      await Deploy.push(projectId, p.github.owner, p.github.repo, p.github.branch || 'main');
      toast('🚀 Push qilindi');
    } catch (e) {
      toast('❌ Push: ' + e.message);
    } finally {
      Activity.hideStatus();
    }
  },

  toggleAutoPush() {
    this.autoPush = !this.autoPush;
    Store.set('sp_auto_push', this.autoPush);
    toast(this.autoPush ? 'Auto-push ON' : 'Auto-push OFF');
  },

  open() {
    App.nav('ai');
    AI.addWelcome = function () {
      const el = document.getElementById('chat-messages');
      if (!el) return;
      el.innerHTML = '';
      AI.appendBubble('ai', `**SadiPrime** — sizning shaxsiy coding miyangiz 🧠\n\nClaude Code uslubida: reja → kod → diff → push.\nBarcha kalitlar (OpenRouter/Groq) ishlatiladi.\n\n**Buyruqlar:** /push · /rebuild · SelfImport · Skilllar\n**Nima quramiz?**`, false);
    };
    AI.clear();
  }
};

// ═══ SELF IMPORT — local + optional Supabase ═══════════════════
const SelfImport = {
  table: 'omnicode_sessions',

  config() {
    const k = Store.get('keys', {});
    return {
      url: (k.supabaseUrl || '').replace(/\/$/, ''),
      key: k.supabaseAnon || '',
      userId: k.ownerId || (window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString()) || 'owner',
    };
  },

  getLocalState() {
    return Store.get('sp_state', { goal: '', summary: '', updated: 0 });
  },

  setLocalState(partial) {
    const cur = this.getLocalState();
    const next = { ...cur, ...partial, updated: Date.now() };
    Store.set('sp_state', next);
    return next;
  },

  async saveState(partial) {
    const next = this.setLocalState(partial);
    const cfg = this.config();
    if (!cfg.url || !cfg.key) return next;

    try {
      await fetch(`${cfg.url}/rest/v1/${this.table}`, {
        method: 'POST',
        headers: {
          'apikey': cfg.key,
          'Authorization': `Bearer ${cfg.key}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates',
        },
        body: JSON.stringify({
          user_id: cfg.userId,
          goal: next.goal,
          summary: next.summary,
          project_id: State.projectId || null,
          updated_at: new Date().toISOString(),
        }),
      });
    } catch (e) {
      console.warn('Supabase saveState', e);
    }
    return next;
  },

  async loadState() {
    const local = this.getLocalState();
    const cfg = this.config();
    if (!cfg.url || !cfg.key) return local;

    try {
      const res = await fetch(
        `${cfg.url}/rest/v1/${this.table}?user_id=eq.${encodeURIComponent(cfg.userId)}&order=updated_at.desc&limit=1`,
        {
          headers: {
            'apikey': cfg.key,
            'Authorization': `Bearer ${cfg.key}`,
          },
        }
      );
      if (!res.ok) return local;
      const rows = await res.json();
      if (rows[0]) {
        const remote = {
          goal: rows[0].goal || '',
          summary: rows[0].summary || '',
          updated: Date.parse(rows[0].updated_at) || Date.now(),
        };
        this.setLocalState(remote);
        return remote;
      }
    } catch (e) {
      console.warn('Supabase loadState', e);
    }
    return local;
  },

  /** Snapshot current project + optional app bootstrap into storage */
  async snapshotApp() {
    const projectId = State.projectId;
    const files = {};
    if (projectId) {
      for (const path of FS.index(projectId)) {
        files[path] = FS.read(projectId, path);
      }
    }
    const payload = {
      user_id: this.config().userId,
      project_id: projectId,
      files,
      chat: State.chatHistory.slice(-30),
      state: this.getLocalState(),
      ts: Date.now(),
    };
    Store.set('sp_snapshot', payload);

    const cfg = this.config();
    if (cfg.url && cfg.key) {
      try {
        await fetch(`${cfg.url}/rest/v1/omnicode_snapshots`, {
          method: 'POST',
          headers: {
            'apikey': cfg.key,
            'Authorization': `Bearer ${cfg.key}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            user_id: payload.user_id,
            project_id: payload.project_id,
            payload,
            created_at: new Date().toISOString(),
          }),
        });
      } catch (e) {
        console.warn('snapshot remote', e);
      }
    }
    return payload;
  },

  async restoreSnapshot() {
    const snap = Store.get('sp_snapshot', null);
    if (!snap?.files) { toast('Snapshot yo\'q'); return; }
    if (!State.projectId) { toast('Avval loyiha oching'); return; }
    for (const [path, content] of Object.entries(snap.files)) {
      FS.write(State.projectId, path, content);
    }
    if (snap.chat) State.chatHistory = snap.chat;
    if (snap.state) this.setLocalState(snap.state);
    Projects.render();
    toast('✅ Snapshot tiklandi');
  },

  /** Import OmniCode source tree description for self-rebuild context */
  appManifest() {
    return `OmniCode frontend modules:
- index.html — screens, nav, sheets
- app.js — FS, PM, AI, Git, Agents, Deploy, Settings
- features.js — Activity, SelfHeal, SMMAI, KeysPanel
- sadiprime.js — SadiPrime brain, Skills, SelfImport
- styles/main.css — UI
Self-rebuild writes these paths relative to frontend/.`;
  }
};

// Patch AI.system to use SadiPrime brain when enabled
(function installSadiPrime() {
  Store.set('sp_enabled', true);
  const _system = AI.system.bind(AI);
  AI.system = function () {
    if (Store.get('sp_enabled', true)) {
      const projectCtx = State.projectId ? FS.context(State.projectId) : '';
      const project = State.projectId ? PM.get(State.projectId) : null;
      return SadiPrime.brain() +
        `\nACTIVE PROJECT: ${project ? project.name : 'None'}` +
        `\n${SelfImport.appManifest()}` +
        projectCtx;
    }
    return _system();
  };

  // Route chat send through SadiPrime for meta tags + state
  const _send = AI.send.bind(AI);
  AI.send = async function (text) {
    const msg = (text || document.getElementById('chat-input')?.value || '').trim();
    if (msg.startsWith('/sp') || msg.startsWith('/sadi')) {
      return SadiPrime.run(msg.replace(/^\/(sp|sadi)\s*/i, ''));
    }
    if (msg === '/push') return SadiPrime.pushIfLinked();
    if (msg === '/snapshot') return SelfImport.snapshotApp().then(() => toast('Snapshot OK'));
    if (msg === '/restore') return SelfImport.restoreSnapshot();

    await _send(text);

    // After normal send, parse meta from last assistant message
    const last = State.chatHistory.filter(m => m.role === 'assistant').pop();
    if (last) {
      const meta = SadiPrime.parseMeta(last.content);
      if (meta.goal || meta.summary) await SelfImport.saveState({ goal: meta.goal, summary: meta.summary });
      if (meta.autoPush) {
        AI.appendBubble('ai', 'Apply qiling, keyin auto-push ishlaydi yoki /push yuboring.', false);
      }
    }
  };

  // After applyAll, optional auto push
  const _apply = DiffView.applyAll.bind(DiffView);
  DiffView.applyAll = function () {
    _apply();
    if (SadiPrime.autoPush) {
      setTimeout(() => SadiPrime.pushIfLinked(), 400);
    }
    SelfImport.snapshotApp().catch(() => {});
  };

  SelfImport.loadState().then(st => {
    if (st.summary) console.log('SadiPrime state:', st);
  });

  console.log('✓ SadiPrime brain online');
})();

// Extend KeysPanel for Supabase
(function extendKeys() {
  const _open = KeysPanel.open.bind(KeysPanel);
  KeysPanel.open = function () {
    _open();
    const keys = Store.get('keys', {});
    const fields = document.getElementById('connector-fields');
    if (!fields) return;
    fields.innerHTML += `
      <label class="sh-label">Supabase URL (SelfImport)</label>
      <input id="conn-sb-url" class="sh-input" type="url" placeholder="https://xxx.supabase.co" value="${keys.supabaseUrl || ''}">
      <label class="sh-label">Supabase anon key</label>
      <input id="conn-sb-key" class="sh-input" type="password" placeholder="eyJ..." value="${keys.supabaseAnon || ''}">
      <label class="sh-label">Owner ID (ixtiyoriy)</label>
      <input id="conn-owner" class="sh-input" placeholder="telegram user id" value="${keys.ownerId || ''}">
    `;
  };

  const _saveAll = KeysPanel.saveAll.bind(KeysPanel);
  KeysPanel.saveAll = function () {
    _saveAll();
    const keys = Store.get('keys', {});
    const url = document.getElementById('conn-sb-url')?.value.trim();
    const sb = document.getElementById('conn-sb-key')?.value.trim();
    const oid = document.getElementById('conn-owner')?.value.trim();
    if (url) keys.supabaseUrl = url;
    if (sb) keys.supabaseAnon = sb;
    if (oid) keys.ownerId = oid;
    Store.set('keys', keys);
  };
})();
