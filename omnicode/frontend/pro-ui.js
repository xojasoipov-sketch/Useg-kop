'use strict';
// ═══════════════════════════════════════════════════════════════
//  OmniCode Pro UI — Chat History · Project Info · File Gen · Terminal
// ═══════════════════════════════════════════════════════════════

const ChatSessions = {
  list() {
    return Store.get('chat_sessions', []);
  },
  saveList(arr) {
    Store.set('chat_sessions', arr.slice(0, 40));
  },
  currentId() {
    return Store.get('chat_session_id', null);
  },
  setCurrent(id) {
    Store.set('chat_session_id', id);
  },

  create(title) {
    const id = 'c_' + Date.now();
    const s = {
      id,
      title: (title || 'Yangi suhbat').slice(0, 60),
      projectId: State.projectId || null,
      messages: [],
      created: Date.now(),
      updated: Date.now(),
    };
    const list = this.list();
    list.unshift(s);
    this.saveList(list);
    this.setCurrent(id);
    return s;
  },

  get(id) {
    return this.list().find(s => s.id === id);
  },

  snapshotFromState() {
    let id = this.currentId();
    if (!id) {
      const s = this.create('Suhbat');
      id = s.id;
    }
    const list = this.list();
    const idx = list.findIndex(s => s.id === id);
    if (idx < 0) return;
    list[idx].messages = (State.chatHistory || []).slice(-40);
    list[idx].updated = Date.now();
    list[idx].projectId = State.projectId || list[idx].projectId;
    if (State.chatHistory && State.chatHistory.length) {
      const firstUser = State.chatHistory.find(m => m.role === 'user');
      if (firstUser) list[idx].title = String(firstUser.content).slice(0, 48);
    }
    this.saveList(list);
    this.render();
  },

  load(id) {
    const s = this.get(id);
    if (!s) return;
    this.setCurrent(id);
    State.chatHistory = s.messages || [];
    if (s.projectId) {
      PM.setCurrent(s.projectId);
      const p = PM.get(s.projectId);
      const lab = document.getElementById('active-project-label');
      if (lab && p) {
        lab.textContent = p.name;
        lab.style.display = '';
      }
    }
    const el = document.getElementById('chat-messages');
    if (el) {
      el.innerHTML = '';
      if (!State.chatHistory.length) {
        AI.addWelcome();
      } else {
        State.chatHistory.forEach(m => {
          AI.appendBubble(m.role === 'user' ? 'user' : 'ai', m.content, false);
        });
      }
    }
    this.render();
    ProjectInfo.render();
    toast('💬 ' + s.title);
  },

  newChat() {
    this.snapshotFromState();
    State.chatHistory = [];
    this.create('Yangi suhbat');
    AI.addWelcome();
    this.render();
  },

  render() {
    const el = document.getElementById('chat-history-list');
    if (!el) return;
    const cur = this.currentId();
    const list = this.list();
    if (!list.length) {
      el.innerHTML = '<div class="ch-empty">Suhbatlar yo\'q</div>';
      return;
    }
    el.innerHTML = list
      .map(s => {
        const active = s.id === cur ? 'active' : '';
        const t = new Date(s.updated || s.created).toLocaleDateString();
        return `<div class="ch-item ${active}" onclick="ChatSessions.load('${s.id}')">
          <div class="ch-title">${escHTML(s.title)}</div>
          <div class="ch-meta">${t}</div>
        </div>`;
      })
      .join('');
  },
};

const ProjectInfo = {
  render() {
    const el = document.getElementById('project-info-body');
    if (!el) return;
    const pid = State.projectId;
    if (!pid) {
      el.innerHTML = '<div class="pi-empty">Loyiha tanlanmagan</div>';
      return;
    }
    const p = PM.get(pid);
    const files = FS.index(pid);
    const gh = p.github;
    const b = typeof Brain !== 'undefined' ? Brain.get(pid) : {};
    el.innerHTML = `
      <div class="pi-row"><span>Loyiha</span><strong>${escHTML(p.name)}</strong></div>
      <div class="pi-row"><span>Fayllar</span><strong>${files.length}</strong></div>
      <div class="pi-row"><span>Branch</span><strong>${gh && gh.branch ? gh.branch : 'main'}</strong></div>
      <div class="pi-row"><span>Repo</span><strong>${gh ? gh.owner + '/' + gh.repo : '—'}</strong></div>
      <div class="pi-row"><span>Framework</span><strong>${p.template || 'blank'}</strong></div>
      <div class="pi-row"><span>Goal</span><strong style="font-size:11px;font-weight:500">${escHTML((b.goal || '—').slice(0, 80))}</strong></div>
      <div class="pi-files">${files
        .slice(0, 12)
        .map(f => `<div class="pi-file" onclick="Editor.open('${pid}','${f}')">${fileIcon(f)} ${escHTML(f)}</div>`)
        .join('')}</div>`;
  },
};

/** Real-time file generator panel */
const FileGen = {
  show(writes) {
    const el = document.getElementById('file-gen-list');
    if (!el) return;
    if (!writes || !writes.length) {
      el.innerHTML = '<div class="fg-empty">AI hali fayl yozmadi</div>';
      return;
    }
    el.innerHTML = writes
      .map(
        (w, i) =>
          `<div class="fg-item" onclick="FileGen.preview(${i})">
            <span class="fg-path">${escHTML(w.path)}</span>
            <span class="fg-lines">${(w.content || '').split('\n').length} qator</span>
          </div>`
      )
      .join('');
  },

  preview(i) {
    const w = State.pendingWrites[i];
    if (!w) return;
    const body = document.getElementById('file-gen-preview');
    if (body) {
      body.innerHTML = `<div class="fg-prev-path">${escHTML(w.path)}</div><pre class="fg-prev-code">${escHTML(
        (w.content || '').slice(0, 3000)
      )}</pre>`;
    }
  },

  clear() {
    this.show([]);
    const body = document.getElementById('file-gen-preview');
    if (body) body.innerHTML = '';
  },
};

/** Hidden terminal — Cursor-style status stream */
const HiddenTerminal = {
  lines: [],

  log(msg) {
    const t = new Date().toLocaleTimeString('en-US', { hour12: false });
    this.lines.push({ t, msg: String(msg) });
    if (this.lines.length > 60) this.lines.shift();
    this.render();
  },

  render() {
    const el = document.getElementById('hidden-term');
    if (!el) return;
    el.innerHTML = this.lines
      .slice(-12)
      .map(l => `<div class="ht-line"><span class="ht-t">${l.t}</span> ${escHTML(l.msg)}</div>`)
      .join('');
    el.scrollTop = el.scrollHeight;
  },

  sequence(steps) {
    let i = 0;
    const run = () => {
      if (i >= steps.length) return;
      this.log(steps[i]);
      i++;
      setTimeout(run, 350);
    };
    run();
  },
};

// Patch AI to snapshot sessions + file gen + terminal
(function proPatches() {
  if (typeof AI === 'undefined') return;

  const _append = AI.appendBubble.bind(AI);
  AI.appendBubble = function (role, text, hasWrites) {
    const div = _append(role, text, hasWrites);
    if (hasWrites && State.pendingWrites) FileGen.show(State.pendingWrites);
    ChatSessions.snapshotFromState();
    return div;
  };

  const _send = AI.send.bind(AI);
  AI.send = async function (text) {
    HiddenTerminal.log('Preparing…');
    HiddenTerminal.log('Understanding request…');
    try {
      const r = await _send(text);
      if (State.pendingWrites && State.pendingWrites.length) {
        HiddenTerminal.log('Writing ' + State.pendingWrites.length + ' file(s)…');
        FileGen.show(State.pendingWrites);
      }
      HiddenTerminal.log('Done');
      ChatSessions.snapshotFromState();
      ProjectInfo.render();
      if (typeof Insights !== 'undefined') Insights.render(State.projectId);
      return r;
    } catch (e) {
      HiddenTerminal.log('Error: ' + e.message);
      throw e;
    }
  };

  if (typeof AutoMode !== 'undefined') {
    const _auto = AutoMode.run.bind(AutoMode);
    AutoMode.run = async function (goal) {
      HiddenTerminal.sequence([
        'Preparing…',
        'Installing context…',
        'Planning agents…',
        'Running pipeline…',
      ]);
      return _auto(goal);
    };
  }

  if (typeof Projects !== 'undefined') {
    const _open = Projects.open.bind(Projects);
    Projects.open = function (id) {
      _open(id);
      ProjectInfo.render();
      if (typeof RepoIndexer !== 'undefined') RepoIndexer.build(id);
    };
  }
})();

window.ChatSessions = ChatSessions;
window.ProjectInfo = ProjectInfo;
window.FileGen = FileGen;
window.HiddenTerminal = HiddenTerminal;

setTimeout(function () {
  ChatSessions.render();
  ProjectInfo.render();
  FileGen.clear();
  HiddenTerminal.log('OmniCode Pro UI ready');
}, 600);
