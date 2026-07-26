'use strict';
// OmniCode Features v4 — Activity, SelfHeal, SMM AI, Keys
// Uses existing FS, AI, AIRouter, Agents, Store, Sheet, toast

// ═══ ACTIVITY — kod o'zgarishlari + agent holati ═══════════════
const Activity = {
  stats: { added: 0, removed: 0, files: 0, agents: [] },

  reset() {
    this.stats = { added: 0, removed: 0, files: 0, agents: [] };
    this.render();
  },

  countDiff(oldText, newText) {
    const o = (oldText || '').split('\n').length;
    const n = (newText || '').split('\n').length;
    const added = Math.max(0, n - o);
    const removed = Math.max(0, o - n);
    // rough: if both grew differently use line counts
    if (oldText && newText && o === n) {
      // count changed lines approx
      const ol = (oldText || '').split('\n');
      const nl = (newText || '').split('\n');
      let ch = 0;
      for (let i = 0; i < ol.length; i++) if (ol[i] !== (nl[i] || '')) ch++;
      return { added: ch, removed: ch };
    }
    return { added, removed };
  },

  recordWrites(writes) {
    if (!writes || !writes.length) return;
    let add = 0, rem = 0;
    for (const w of writes) {
      const old = State.projectId ? FS.read(State.projectId, w.path) : '';
      const d = this.countDiff(old, w.content);
      add += d.added;
      rem += d.removed;
    }
    this.stats.added += add;
    this.stats.removed += rem;
    this.stats.files += writes.length;
    this.render();
    this.showBadge(add, rem, writes.length);
  },

  setAgents(list) {
    this.stats.agents = list || [];
    this.render();
  },

  showBadge(added, removed, files) {
    const el = document.getElementById('chat-messages');
    if (!el) return;
    const div = document.createElement('div');
    div.className = 'bubble ai activity-badge';
    div.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-size:12px">
        <span style="color:var(--green);font-weight:700">+${added} qator</span>
        <span style="color:var(--accent);font-weight:700">-${removed} qator</span>
        <span style="color:var(--text3)">${files} fayl</span>
        ${this.stats.agents.length ? `<span style="color:var(--blue)">${this.stats.agents.length} agent</span>` : ''}
      </div>
      ${this.stats.agents.length ? `<div style="margin-top:6px;font-size:11px;color:var(--text3)">Agentlar: ${this.stats.agents.map(a => a).join(' → ')}</div>` : ''}
    `;
    el.appendChild(div);
    el.scrollTop = el.scrollHeight;
  },

  render() {
    const bar = document.getElementById('activity-bar');
    if (!bar) return;
    bar.innerHTML = `
      <span class="act-item" style="color:var(--green)">+${this.stats.added}</span>
      <span class="act-item" style="color:var(--accent)">-${this.stats.removed}</span>
      <span class="act-item">${this.stats.files} fayl</span>
      <span class="act-item">${this.stats.agents.length || 0} agent</span>
    `;
  },

  showStatus(msg) {
    const el = document.getElementById('chat-messages');
    if (!el) return;
    let ind = document.getElementById('status-ind');
    if (!ind) {
      ind = document.createElement('div');
      ind.id = 'status-ind';
      ind.className = 'bubble thinking';
      el.appendChild(ind);
    }
    ind.innerHTML = `<div class="thinking-dots"><span></span><span></span><span></span></div><span style="font-size:13px;color:var(--text3)">${msg}</span>`;
    el.scrollTop = el.scrollHeight;
  },

  hideStatus() {
    document.getElementById('status-ind')?.remove();
  }
};

// Hook into DiffView.applyAll and AI.send
(function patchAI() {
  const _apply = DiffView.applyAll.bind(DiffView);
  DiffView.applyAll = function () {
    Activity.recordWrites(State.pendingWrites);
    _apply();
  };

  const _send = AI.send.bind(AI);
  AI.send = async function (text) {
    Activity.showStatus('AI o\'ylamoqda...');
    try {
      await _send(text);
    } finally {
      Activity.hideStatus();
    }
    if (State.pendingWrites.length) {
      Activity.recordWrites(State.pendingWrites);
    }
  };

  const _pipe = Agents.runPipeline.bind(Agents);
  Agents.runPipeline = async function (task, agentList) {
    Activity.setAgents(agentList || ['planner', 'coder', 'reviewer']);
    Activity.showStatus(`Pipeline: ${(agentList || []).join(' → ')}`);
    try {
      await _pipe(task, agentList);
    } finally {
      Activity.hideStatus();
      if (State.pendingWrites.length) Activity.recordWrites(State.pendingWrites);
    }
  };
})();

// ═══ SELF HEAL — o'zini o'zi tuzatish ═══════════════════════════
const SelfHeal = {
  async analyze() {
    App.nav('ai');
    Activity.showStatus('Kod tahlil qilinmoqda...');
    Activity.setAgents(['reviewer', 'coder']);

    const projectId = State.projectId;
    const ctx = projectId ? FS.context(projectId, 8000) : 'No project — analyze OmniCode app structure.';

    const messages = [
      {
        role: 'system',
        content: `You are SelfHeal agent of OmniCode. Find bugs and improve code.
Use <WRITE_FILE path="...">...</WRITE_FILE> for fixes.
Be concrete. Prefer minimal changes. Explain briefly in Uzbek or English.`
      },
      {
        role: 'user',
        content: `Analyze and fix issues in this project:\n${ctx}\n\nReturn improved files with WRITE_FILE tags.`
      }
    ];

    try {
      const reply = await AIRouter.call(messages);
      Activity.hideStatus();
      const writes = FS.parseWrites(reply);
      if (writes.length) {
        State.pendingWrites = writes;
        Activity.recordWrites(writes);
        AI.appendBubble('ai', reply, true);
        toast(`🔧 ${writes.length} tuzatish tayyor`);
      } else {
        AI.appendBubble('ai', reply || 'Muammo topilmadi.', false);
      }
      State.chatHistory.push({ role: 'assistant', content: reply });
    } catch (e) {
      Activity.hideStatus();
      AI.appendBubble('ai', `❌ SelfHeal: ${e.message}`, false);
    }
  }
};

const SelfImprove = {
  async run() {
    App.nav('ai');
    Activity.showStatus('O\'zini yaxshilash...');
    Activity.setAgents(['optimizer', 'coder']);

    const messages = [
      {
        role: 'system',
        content: `You improve OmniCode itself. Suggest better UX, performance, features.
Use WRITE_FILE for concrete code changes. Short explanation.`
      },
      {
        role: 'user',
        content: 'Improve OmniCode mobile AI coding app: better chat UX, activity stats, self-heal. Write improved snippets if useful.'
      }
    ];

    try {
      const reply = await AIRouter.call(messages);
      Activity.hideStatus();
      const writes = FS.parseWrites(reply);
      if (writes.length) {
        State.pendingWrites = writes;
        Activity.recordWrites(writes);
        AI.appendBubble('ai', reply, true);
      } else {
        AI.appendBubble('ai', reply, false);
      }
    } catch (e) {
      Activity.hideStatus();
      toast('❌ ' + e.message);
    }
  }
};

// ═══ SMM AI ════════════════════════════════════════════════════
const SMMAI = {
  history: [],

  open() {
    App.nav('smm');
    this.render();
  },

  render() {
    const el = document.getElementById('smm-messages');
    if (!el) return;
    if (!this.history.length) {
      el.innerHTML = `<div class="bubble ai">**SMM AI** 📱\n\nKontent, post, caption, hashtag, reklama matnlari.\n\nMisol: «Instagram uchun AI tool haqida post yoz»</div>`;
    }
  },

  async send() {
    const inp = document.getElementById('smm-input');
    const msg = (inp?.value || '').trim();
    if (!msg) return;
    if (inp) inp.value = '';

    const el = document.getElementById('smm-messages');
    const u = document.createElement('div');
    u.className = 'bubble user';
    u.textContent = msg;
    el.appendChild(u);

    const thinking = document.createElement('div');
    thinking.className = 'bubble thinking';
    thinking.id = 'smm-thinking';
    thinking.innerHTML = `<div class="thinking-dots"><span></span><span></span><span></span></div><span style="font-size:13px;color:var(--text3)">Yozilmoqda...</span>`;
    el.appendChild(thinking);
    el.scrollTop = el.scrollHeight;

    const messages = [
      {
        role: 'system',
        content: 'You are SMM AI. Write social media posts, captions, hashtags, ad copy in Uzbek or the user language. Be creative and concise. Format with markdown.'
      },
      ...this.history.slice(-8),
      { role: 'user', content: msg }
    ];

    try {
      const reply = await AIRouter.call(messages);
      document.getElementById('smm-thinking')?.remove();
      const a = document.createElement('div');
      a.className = 'bubble ai';
      a.innerHTML = MD.render(reply);
      el.appendChild(a);
      this.history.push({ role: 'user', content: msg });
      this.history.push({ role: 'assistant', content: reply });
      el.scrollTop = el.scrollHeight;
    } catch (e) {
      document.getElementById('smm-thinking')?.remove();
      toast('❌ ' + e.message);
    }
  },

  onKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.send();
    }
  }
};

// ═══ KEYS PANEL ════════════════════════════════════════════════
const KeysPanel = {
  open() {
    const keys = Store.get('keys', {});
    const fields = document.getElementById('connector-fields');
    if (fields) {
      fields.innerHTML = `
        <label class="sh-label">OpenRouter Key 1</label>
        <input id="conn-key1" class="sh-input" type="password" placeholder="sk-or-v1-..." value="${keys.or1 || ''}">
        <label class="sh-label">OpenRouter Key 2 (ixtiyoriy)</label>
        <input id="conn-key2" class="sh-input" type="password" placeholder="sk-or-v1-..." value="${keys.or2 || ''}">
        <label class="sh-label">Groq Key</label>
        <input id="conn-key-groq" class="sh-input" type="password" placeholder="gsk_..." value="${keys.groq || ''}">
        <label class="sh-label">GitHub Token</label>
        <input id="conn-key-gh" class="sh-input" type="password" placeholder="ghp_..." value="${keys.github || ''}">
      `;
    }
    document.getElementById('connector-sheet-title').textContent = 'AI API Kalitlar';
    Settings._conn = 'all';
    Sheet.open('connector-sheet');
  },

  saveAll() {
    const keys = Store.get('keys', {});
    const k1 = document.getElementById('conn-key1')?.value.trim();
    const k2 = document.getElementById('conn-key2')?.value.trim();
    const groq = document.getElementById('conn-key-groq')?.value.trim();
    const gh = document.getElementById('conn-key-gh')?.value.trim();
    if (k1) keys.or1 = k1;
    if (k2) keys.or2 = k2;
    if (groq) keys.groq = groq;
    if (gh) keys.github = gh;
    Store.set('keys', keys);
    Sheet.close('connector-sheet');
    Settings.refresh();
    toast('✅ Kalitlar saqlandi');
  }
};

// Override Settings.save when all keys panel
const _save = Settings.save.bind(Settings);
Settings.save = function () {
  if (this._conn === 'all') return KeysPanel.saveAll();
  return _save();
};

// ═══ NAV PATCH — SMM ═══════════════════════════════════════════
const _nav = App.nav.bind(App);
App.nav = function (id) {
  _nav(id);
  if (id === 'smm') SMMAI.render();
};

// Ensure activity bar exists
document.addEventListener('DOMContentLoaded', () => {
  const chat = document.getElementById('ai');
  if (chat && !document.getElementById('activity-bar')) {
    const bar = document.createElement('div');
    bar.id = 'activity-bar';
    bar.style.cssText = 'display:flex;gap:12px;padding:6px 16px;font-size:11px;font-weight:700;border-bottom:1px solid var(--border);background:var(--bg2);flex-shrink:0';
    bar.innerHTML = '<span class="act-item">+0</span><span class="act-item">-0</span><span class="act-item">0 fayl</span><span class="act-item">0 agent</span>';
    const tools = chat.querySelector('.chat-tools-bar');
    if (tools) tools.parentNode.insertBefore(bar, tools);
    else chat.insertBefore(bar, chat.firstChild);
  }
});

console.log('✓ OmniCode features.js loaded');
