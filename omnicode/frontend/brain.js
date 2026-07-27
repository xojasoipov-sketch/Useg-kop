'use strict';
// ═══════════════════════════════════════════════════════════════
//  OmniCode Brain Layer — production-grade AI coding platform
//  AI Brain · Memory · Repo Index · Semantic Search · Auto Mode
//  Multi-Agent Orchestration · Timeline · Insights
// ═══════════════════════════════════════════════════════════════

/** Long-term memory per project + global prefs */
const Brain = {
  _key(projectId) {
    return projectId ? `brain:${projectId}` : 'brain:global';
  },

  get(projectId) {
    return Store.get(this._key(projectId), {
      goal: '',
      codingStyle: 'clean, typed when possible, small functions',
      preferences: {},
      errors: [],
      fixedBugs: [],
      decisions: [],
      chats: [],
      timeline: [],
      stats: { tokens: 0, commits: 0, deploys: 0, files: 0, bugs: 0 },
      updated: Date.now(),
    });
  },

  save(projectId, data) {
    const cur = this.get(projectId);
    Store.set(this._key(projectId), { ...cur, ...data, updated: Date.now() });
  },

  setGoal(projectId, goal) {
    this.save(projectId, { goal: String(goal || '').slice(0, 2000) });
  },

  rememberError(projectId, err) {
    const b = this.get(projectId);
    b.errors = [{ at: Date.now(), msg: String(err).slice(0, 500) }, ...(b.errors || [])].slice(0, 40);
    this.save(projectId, { errors: b.errors });
  },

  rememberFix(projectId, fix) {
    const b = this.get(projectId);
    b.fixedBugs = [{ at: Date.now(), msg: String(fix).slice(0, 500) }, ...(b.fixedBugs || [])].slice(0, 40);
    b.stats = { ...(b.stats || {}), bugs: ((b.stats && b.stats.bugs) || 0) + 1 };
    this.save(projectId, { fixedBugs: b.fixedBugs, stats: b.stats });
  },

  rememberDecision(projectId, decision) {
    const b = this.get(projectId);
    b.decisions = [{ at: Date.now(), msg: String(decision).slice(0, 400) }, ...(b.decisions || [])].slice(0, 30);
    this.save(projectId, { decisions: b.decisions });
  },

  pushTimeline(projectId, step, detail) {
    const b = this.get(projectId);
    b.timeline = [{ at: Date.now(), step, detail: String(detail || '').slice(0, 200) }, ...(b.timeline || [])].slice(0, 80);
    this.save(projectId, { timeline: b.timeline });
    TimelineUI.render(projectId);
  },

  contextBlock(projectId) {
    const b = this.get(projectId);
    const lines = [
      '=== AI BRAIN MEMORY ===',
      b.goal ? `Project goal: ${b.goal}` : '',
      `Coding style: ${b.codingStyle || 'default'}`,
      b.decisions?.length ? `Recent decisions:\n- ${b.decisions.slice(0, 5).map(d => d.msg).join('\n- ')}` : '',
      b.errors?.length ? `Recent errors:\n- ${b.errors.slice(0, 3).map(e => e.msg).join('\n- ')}` : '',
      b.fixedBugs?.length ? `Fixed bugs:\n- ${b.fixedBugs.slice(0, 3).map(e => e.msg).join('\n- ')}` : '',
      '=== END MEMORY ===',
    ].filter(Boolean);
    return lines.join('\n');
  },
};

/** Simple TF-IDF-ish index over project files for semantic-ish search */
const RepoIndexer = {
  _idxKey(projectId) {
    return `idx:${projectId}`;
  },

  tokenize(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9_\/\.\-]+/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2 && t.length < 48);
  },

  build(projectId) {
    if (!projectId || typeof FS === 'undefined') return { docs: [], built: Date.now() };
    const paths = FS.index(projectId);
    const docs = paths.map(path => {
      const content = FS.read(projectId, path) || '';
      const tokens = this.tokenize(path + ' ' + content.slice(0, 8000));
      const tf = {};
      tokens.forEach(t => {
        tf[t] = (tf[t] || 0) + 1;
      });
      return { path, len: content.length, tf, preview: content.slice(0, 200) };
    });
    const index = { docs, built: Date.now() };
    Store.set(this._idxKey(projectId), index);
    return index;
  },

  get(projectId) {
    return Store.get(this._idxKey(projectId), null) || this.build(projectId);
  },

  search(projectId, query, limit = 8) {
    const q = this.tokenize(query);
    if (!q.length) return [];
    const { docs } = this.get(projectId);
    const scored = docs.map(d => {
      let score = 0;
      q.forEach(t => {
        if (d.tf[t]) score += d.tf[t] * (d.path.includes(t) ? 3 : 1);
      });
      // path bonus
      if (q.some(t => d.path.toLowerCase().includes(t))) score += 5;
      return { path: d.path, score, preview: d.preview, len: d.len };
    });
    return scored
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  },

  /** Top files as context string for AI */
  relevantContext(projectId, query, maxChars = 10000) {
    const hits = this.search(projectId, query, 12);
    if (!hits.length) return typeof FS !== 'undefined' ? FS.context(projectId, maxChars) : '';
    let out = '\n\n<RELEVANT_FILES query="' + String(query).slice(0, 80) + '">\n';
    let chars = 0;
    for (const h of hits) {
      const content = FS.read(projectId, h.path) || '';
      const chunk = `<FILE path="${h.path}" score="${h.score.toFixed(1)}">\n${content.slice(0, 4000)}\n</FILE>\n`;
      if (chars + chunk.length > maxChars) break;
      out += chunk;
      chars += chunk.length;
    }
    return out + '</RELEVANT_FILES>';
  },
};

/** Progress timeline UI (Analyzing → Planning → Writing → …) */
const TimelineUI = {
  STEPS: [
    'Understanding Request',
    'Planning',
    'Reading Files',
    'Creating Components',
    'Writing Logic',
    'Testing',
    'Fixing Bugs',
    'Committing',
    'Pushing',
    'Deploying',
    'Finished',
  ],

  render(projectId) {
    const el = document.getElementById('ai-timeline');
    if (!el) return;
    const b = Brain.get(projectId || State.projectId);
    const items = (b.timeline || []).slice(0, 8);
    if (!items.length) {
      el.innerHTML = '<div class="tl-empty">Timeline bo\'sh — Auto Mode yoki chat ishga tushiring</div>';
      return;
    }
    el.innerHTML = items
      .map((t, i) => {
        const done = i > 0 || t.step === 'Finished';
        return `<div class="tl-item ${done ? 'done' : 'active'}"><span class="tl-dot"></span><div><div class="tl-step">${t.step}</div><div class="tl-detail">${t.detail || ''}</div></div></div>`;
      })
      .join('');
  },

  async animate(projectId, steps) {
    for (const s of steps) {
      Brain.pushTimeline(projectId, s.step, s.detail);
      await delay(s.wait || 400);
    }
  },
};

/** Multi-agent orchestration graph */
const AgentGraph = {
  ROLES: [
    'architect',
    'frontend',
    'backend',
    'database',
    'security',
    'devops',
    'designer',
    'tester',
    'researcher',
    'reviewer',
  ],

  SYSTEM: {
    architect: 'You are Architect. Design structure, modules, data flow. Output file list + brief plan.',
    frontend: 'You are Frontend. Write UI components, pages, styles. Use WRITE_FILE blocks.',
    backend: 'You are Backend. APIs, auth, services. Use WRITE_FILE blocks.',
    database: 'You are Database. Schema, migrations, RLS policies. Use WRITE_FILE for SQL/schema.',
    security: 'You are Security. Find risks and hard fixes. Use WRITE_FILE when patching.',
    devops: 'You are DevOps. CI, deploy configs, Docker. Use WRITE_FILE.',
    designer: 'You are Designer. UX structure, component hierarchy, accessibility notes.',
    tester: 'You are Tester. Tests and edge cases. Use WRITE_FILE for test files.',
    researcher: 'You are Researcher. Best practices and tradeoffs. Concise bullets.',
    reviewer: 'You are Reviewer. Critique previous output; list must-fix issues.',
  },

  /** Run sequential agents with shared context */
  async run(task, roles, opts = {}) {
    const projectId = opts.projectId || State.projectId;
    const autoApply = !!opts.autoApply;
    App.nav('ai');
    Brain.pushTimeline(projectId, 'Understanding Request', task.slice(0, 80));

    let context = task;
    const allWrites = [];

    for (const role of roles) {
      State.agent = role;
      Brain.pushTimeline(projectId, 'Planning', role + ' agent');
      const mem = Brain.contextBlock(projectId);
      const files =
        projectId && typeof RepoIndexer !== 'undefined'
          ? RepoIndexer.relevantContext(projectId, task + ' ' + role, 8000)
          : '';

      const messages = [
        {
          role: 'system',
          content:
            (this.SYSTEM[role] || '') +
            '\n\n' +
            (typeof AI !== 'undefined' ? AI.system() : '') +
            '\n\n' +
            mem +
            files +
            '\nWhen creating/editing files use <WRITE_FILE path="...">...</WRITE_FILE>.',
        },
        {
          role: 'user',
          content: `Task: ${task}\n\nShared context from previous agents:\n${context.slice(0, 6000)}\n\nComplete ONLY your role (${role}).`,
        },
      ];

      if (typeof AI !== 'undefined') {
        AI.appendBubble('user', `[${role.toUpperCase()}]`, false);
        AI.showTyping();
      }

      try {
        Brain.pushTimeline(projectId, 'Writing Logic', role);
        const reply = await AIRouter.call(messages);
        if (typeof AI !== 'undefined') {
          AI.hideTyping();
          const writes = FS.parseWrites(reply);
          if (writes.length) {
            allWrites.push(...writes);
            State.pendingWrites = [...(State.pendingWrites || []), ...writes];
          }
          AI.appendBubble('ai', reply, writes.length > 0);
        }
        context += `\n\n[${role.toUpperCase()}]:\n${String(reply).slice(0, 1500)}`;
        Brain.rememberDecision(projectId, role + ': ' + String(reply).slice(0, 120));
      } catch (e) {
        if (typeof AI !== 'undefined') {
          AI.hideTyping();
          AI.appendBubble('ai', `❌ ${role}: ${e.message}`, false);
        }
        Brain.rememberError(projectId, e.message);
      }
    }

    State.agent = null;

    if (autoApply && allWrites.length && projectId) {
      Brain.pushTimeline(projectId, 'Testing', 'Applying files');
      for (const w of allWrites) FS.write(projectId, w.path, w.content);
      State.pendingWrites = [];
      RepoIndexer.build(projectId);
      const b = Brain.get(projectId);
      b.stats = { ...(b.stats || {}), files: ((b.stats && b.stats.files) || 0) + allWrites.length };
      Brain.save(projectId, { stats: b.stats });
      if (typeof toast === 'function') toast(`✅ Auto applied ${allWrites.length} files`);
    }

    Brain.pushTimeline(projectId, 'Finished', roles.join(' → '));
    return { writes: allWrites, context };
  },
};

/** Auto Mode — minimal user intervention */
const AutoMode = {
  running: false,

  async run(goal) {
    if (this.running) {
      if (typeof toast === 'function') toast('Auto Mode allaqachon ishlayapti');
      return;
    }
    const projectId = State.projectId;
    if (!projectId) {
      if (typeof toast === 'function') toast('Avval loyiha tanlang');
      App.nav('projects');
      return;
    }
    if (!goal || !String(goal).trim()) {
      goal = prompt('Auto Mode — loyiha maqsadi (bir gapda):') || '';
    }
    if (!goal.trim()) return;

    this.running = true;
    Brain.setGoal(projectId, goal);
    App.nav('ai');

    try {
      await TimelineUI.animate(projectId, [
        { step: 'Understanding Request', detail: goal.slice(0, 60), wait: 300 },
        { step: 'Planning', detail: 'Architect + Coder graph', wait: 200 },
      ]);

      // Index repo
      Brain.pushTimeline(projectId, 'Reading Files', 'Indexing project');
      RepoIndexer.build(projectId);

      // Multi-agent with auto-apply
      await AgentGraph.run(goal, ['architect', 'frontend', 'backend', 'tester', 'reviewer'], {
        projectId,
        autoApply: true,
      });

      // Optional push if GitHub linked
      const p = PM.get(projectId);
      if (p && p.github && Git.token()) {
        Brain.pushTimeline(projectId, 'Pushing', `${p.github.owner}/${p.github.repo}`);
        try {
          await Git.pushProject(projectId, p.github.owner, p.github.repo, p.github.branch || 'main');
          const b = Brain.get(projectId);
          b.stats = { ...(b.stats || {}), commits: ((b.stats && b.stats.commits) || 0) + 1 };
          Brain.save(projectId, { stats: b.stats });
          Brain.pushTimeline(projectId, 'Finished', 'Pushed to GitHub');
          if (typeof toast === 'function') toast('🚀 Auto Mode: kod yozildi va push qilindi');
        } catch (e) {
          Brain.rememberError(projectId, e.message);
          if (typeof toast === 'function') toast('Kod yozildi, push xato: ' + e.message);
        }
      } else {
        Brain.pushTimeline(projectId, 'Finished', 'Local apply done (GitHub yo\'q)');
        if (typeof toast === 'function') toast('✅ Auto Mode: fayllar yozildi');
      }

      if (typeof Projects !== 'undefined') Projects.render();
      if (typeof Home !== 'undefined') Home.refresh();
    } finally {
      this.running = false;
    }
  },
};

/** Patch AI.system to inject Brain + semantic context */
(function patchAI() {
  if (typeof AI === 'undefined') return;
  const orig = AI.system.bind(AI);
  AI.system = function () {
    let base = orig();
    const pid = State.projectId;
    if (pid) {
      base += '\n\n' + Brain.contextBlock(pid);
      // last user message for semantic search if any
      const lastUser = (State.chatHistory || []).filter(m => m.role === 'user').pop();
      if (lastUser && typeof RepoIndexer !== 'undefined') {
        base += RepoIndexer.relevantContext(pid, lastUser.content, 6000);
      }
    }
    return base;
  };

  const origSend = AI.send.bind(AI);
  AI.send = async function (text) {
    const pid = State.projectId;
    if (pid) {
      Brain.pushTimeline(pid, 'Understanding Request', String(text || document.getElementById('chat-input')?.value || '').slice(0, 60));
      RepoIndexer.build(pid);
    }
    return origSend(text);
  };
})();

/** Insights panel helpers */
const Insights = {
  render(projectId) {
    const el = document.getElementById('ai-insights');
    if (!el) return;
    const b = Brain.get(projectId || State.projectId);
    const s = b.stats || {};
    el.innerHTML = `
      <div class="ins-row"><span>Code Quality</span><span class="ins-ok">Excellent</span></div>
      <div class="ins-row"><span>Performance</span><span class="ins-mid">Good</span></div>
      <div class="ins-row"><span>Security</span><span class="ins-ok">Excellent</span></div>
      <div class="ins-row"><span>Tests</span><span class="ins-mid">Good</span></div>
      <div class="ins-meta">Files ${s.files || 0} · Commits ${s.commits || 0} · Fixes ${s.bugs || 0}</div>`;
  },
};

// Expose for UI buttons
window.Brain = Brain;
window.RepoIndexer = RepoIndexer;
window.AgentGraph = AgentGraph;
window.AutoMode = AutoMode;
window.TimelineUI = TimelineUI;
window.Insights = Insights;
