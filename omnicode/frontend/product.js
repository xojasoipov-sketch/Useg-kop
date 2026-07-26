'use strict';
// OmniCode Product Layer — roadmap modules on top of app.js / SadiPrime / SB

const Product = {
  version: '1.0.0-premium',
  roadmap: {
    mvp: ['chat', 'editor', 'projects', 'github', 'deploy'],
    beta: ['agents', 'preview', 'debug', 'memory'],
    premium: ['voice', 'vision', 'security_audit', 'architecture', 'collab'],
  },
};

// ── 12. Prompt Library ─────────────────────────────────────────
const PromptLib = {
  builtins: [
    { id: 'gen', cat: 'code', title: 'To\'liq modul yoz', body: 'Quyidagi talab bo\'yicha production-ready kod yoz. WRITE_FILE ishlat.' },
    { id: 'explain', cat: 'code', title: 'Kodni tushuntir', body: 'Tanlangan kodni qisqa va aniq tushuntir.' },
    { id: 'refactor', cat: 'code', title: 'Refactor', body: 'Kodni toza qil: nomlash, strukturа, DRY. WRITE_FILE.' },
    { id: 'bugs', cat: 'code', title: 'Bug top', body: 'Xatolarni top va tuzat. WRITE_FILE.' },
    { id: 'tests', cat: 'code', title: 'Unit test', body: 'Asosiy unit testlar yoz. WRITE_FILE.' },
    { id: 'opt', cat: 'code', title: 'Optimallashtir', body: 'Performance va o\'qilishni yaxshila. WRITE_FILE.' },
    { id: 'docs', cat: 'code', title: 'Dokumentatsiya', body: 'README va JSDoc yoz. WRITE_FILE.' },
    { id: 'api', cat: 'code', title: 'REST API', body: 'REST endpointlar + validatsiya yoz. WRITE_FILE.' },
    { id: 'sql', cat: 'code', title: 'SQL', body: 'Jadvallar va so\'rovlar yoz (Postgres/Supabase).' },
    { id: 'regex', cat: 'code', title: 'Regex', body: 'Aniq regex yoz va misollar bilan tushuntir.' },
    { id: 'arch', cat: 'audit', title: 'Arxitektura tahlil', body: 'Loyiha arxitekturasini tahlil qil: qatlamlar, risklar, tavsiyalar.' },
    { id: 'ux', cat: 'audit', title: 'UX Review', body: 'UI/UX ni mobile-first ko\'rib chiq va yaxshilashlar ber.' },
    { id: 'sec', cat: 'audit', title: 'Security Audit', body: 'Xavfsizlik audit: auth, injection, secrets, CORS.' },
    { id: 'perf', cat: 'audit', title: 'Performance Audit', body: 'Bottleneck va optimallashtirish yo\'llari.' },
    { id: 'review', cat: 'audit', title: 'Code Review', body: 'PR uslubida review: must-fix / nice-to-have.' },
  ],
  custom() { return Store.get('prompts_custom', []); },
  all() { return [...this.builtins, ...this.custom()]; },
  saveCustom(p) {
    const list = this.custom();
    list.unshift({ id: 'c_' + Date.now(), ...p });
    Store.set('prompts_custom', list.slice(0, 50));
  },
  open() {
    App.nav('prompts');
    this.render();
  },
  render() {
    const el = document.getElementById('prompts-list');
    if (!el) return;
    const q = (document.getElementById('prompts-search')?.value || '').toLowerCase();
    const items = this.all().filter(p => !q || p.title.toLowerCase().includes(q) || p.body.toLowerCase().includes(q));
    el.innerHTML = items.map(p => `
      <div class="prompt-card" onclick="PromptLib.use('${p.id}')">
        <div class="prompt-title">${p.title}</div>
        <div class="prompt-cat">${p.cat}</div>
        <div class="prompt-body">${p.body.slice(0, 80)}...</div>
      </div>`).join('') || '<div style="padding:20px;color:var(--text3)">Topilmadi</div>';
  },
  use(id) {
    const p = this.all().find(x => x.id === id);
    if (!p) return;
    App.nav('ai');
    const inp = document.getElementById('chat-input');
    if (inp) { inp.value = p.body; inp.focus(); }
    toast(p.title);
  },
};

// ── 16. Monitoring ─────────────────────────────────────────────
const Monitor = {
  stats: Store.get('mon_stats', { tokensIn: 0, tokensOut: 0, calls: 0, errors: 0, lastModel: '', lastMs: 0 }),
  save() { Store.set('mon_stats', this.stats); },
  track(call) {
    this.stats.calls++;
    this.stats.tokensIn += call.in || 0;
    this.stats.tokensOut += call.out || 0;
    this.stats.lastModel = call.model || '';
    this.stats.lastMs = call.ms || 0;
    if (call.error) this.stats.errors++;
    this.save();
    this.render();
  },
  estimateTokens(text) { return Math.ceil((text || '').length / 4); },
  render() {
    const el = document.getElementById('monitor-body');
    if (!el) return;
    const s = this.stats;
    const keys = Store.get('keys', {});
    const gh = !!keys.github;
    const sb = !!(keys.supabaseUrl && keys.supabaseAnon);
    const or = [keys.or1, keys.or2, keys.or3, keys.or4].filter(Boolean).length;
    el.innerHTML = `
      <div class="mon-grid">
        <div class="mon-card"><div class="mon-l">AI chaqiriq</div><div class="mon-v">${s.calls}</div></div>
        <div class="mon-card"><div class="mon-l">Taxminiy token</div><div class="mon-v">${s.tokensIn + s.tokensOut}</div></div>
        <div class="mon-card"><div class="mon-l">Xatolar</div><div class="mon-v">${s.errors}</div></div>
        <div class="mon-card"><div class="mon-l">Oxirgi ms</div><div class="mon-v">${s.lastMs || '—'}</div></div>
      </div>
      <div class="mon-row"><span>Model</span><span>${s.lastModel || State.model?.short || '—'}</span></div>
      <div class="mon-row"><span>OpenRouter</span><span class="${or?'ok':'bad'}">${or} kalit</span></div>
      <div class="mon-row"><span>GitHub</span><span class="${gh?'ok':'bad'}">${gh?'OK':'Yo\'q'}</span></div>
      <div class="mon-row"><span>Supabase</span><span class="${sb?'ok':'bad'}">${sb?'OK':'Yo\'q'}</span></div>
      <div class="mon-row"><span>Groq</span><span class="${keys.groq?'ok':'bad'}">${keys.groq?'OK':'Yo\'q'}</span></div>
    `;
  },
};

// Hook AIRouter for timing
(function monitorAI() {
  if (typeof AIRouter === 'undefined') return;
  const _call = AIRouter.call.bind(AIRouter);
  AIRouter.call = async function (messages, model) {
    const t0 = Date.now();
    const m = model || State.model;
    try {
      const reply = await _call(messages, model);
      Monitor.track({
        in: Monitor.estimateTokens(JSON.stringify(messages)),
        out: Monitor.estimateTokens(reply),
        model: m?.short || m?.id || '',
        ms: Date.now() - t0,
      });
      return reply;
    } catch (e) {
      Monitor.track({ error: true, model: m?.short || '', ms: Date.now() - t0 });
      throw e;
    }
  };
})();

// ── Auto model by task ─────────────────────────────────────────
const ModelRouter = {
  pick(task) {
    const t = (task || '').toLowerCase();
    if (/ rational|reason|plan|architect|audit|review/.test(t)) {
      return MODELS.find(m => /deepseek|r1|qwq/i.test(m.id)) || MODELS[1] || MODELS[0];
    }
    if (/fast|short|caption|smm|title/.test(t)) {
      return MODELS.find(m => m.provider === 'groq') || MODELS[0];
    }
    if (/long|context|refactor|multi/.test(t)) {
      return MODELS.find(m => /gemini|llama-3.3/i.test(m.id)) || MODELS[0];
    }
    return State.model || MODELS[0];
  },
  enableAuto: Store.get('auto_model', true),
  toggle() {
    this.enableAuto = !this.enableAuto;
    Store.set('auto_model', this.enableAuto);
    toast(this.enableAuto ? 'Auto-model ON' : 'Auto-model OFF');
  },
};

// ── Parallel AI (multi-model) ───────────────────────────────────
const ParallelAI = {
  async race(messages, modelIds) {
    const ids = modelIds || MODELS.slice(0, 2).map(m => m.id);
    const jobs = ids.map(async id => {
      const m = MODELS.find(x => x.id === id) || MODELS[0];
      try {
        const text = await AIRouter.call(messages, m);
        return { ok: true, model: m.short, text };
      } catch (e) {
        return { ok: false, model: m.short, text: e.message };
      }
    });
    return Promise.all(jobs);
  },
  async run(userMsg) {
    App.nav('ai');
    AI.appendBubble('user', userMsg, false);
    Activity.showStatus('Parallel AI...');
    const messages = [
      { role: 'system', content: AI.system() },
      { role: 'user', content: userMsg },
    ];
    try {
      const results = await this.race(messages);
      Activity.hideStatus();
      for (const r of results) {
        AI.appendBubble('ai', `**${r.model}**\n\n${r.ok ? r.text : '❌ ' + r.text}`, false);
      }
    } catch (e) {
      Activity.hideStatus();
      toast(e.message);
    }
  },
};

// ── 8. Preview ─────────────────────────────────────────────────
const Preview = {
  open(html) {
    let content = html;
    if (!content && State.projectId) {
      const files = FS.index(State.projectId);
      const idx = files.find(f => /index\.html$/i.test(f)) || files.find(f => /\.html$/i.test(f));
      if (idx) content = FS.read(State.projectId, idx);
    }
    if (!content) { toast('HTML fayl topilmadi'); return; }
    App.nav('preview');
    const frame = document.getElementById('preview-frame');
    if (frame) {
      frame.srcdoc = content;
    }
    this._html = content;
  },
  refresh() { if (this._html) this.open(this._html); },
  setWidth(mode) {
    const wrap = document.getElementById('preview-wrap');
    if (!wrap) return;
    wrap.className = 'preview-wrap ' + (mode || 'mobile');
  },
};

// ── 15. Debug Center ───────────────────────────────────────────
const DebugCenter = {
  async analyze(errorText) {
    const text = errorText || prompt('Stack trace yoki xato matni:') || '';
    if (!text) return;
    App.nav('ai');
    await AI.send(`[DEBUG]\nQuyidagi xatoni tahlil qil, sabab va tuzatish ber. Kerak bo\'lsa WRITE_FILE:\n\n${text}`);
  },
  async autoFix() {
    await SelfHeal.analyze();
  },
};

// ── 10. Vision (image → context) ───────────────────────────────
const Vision = {
  async attach() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const b64 = await this.toBase64(file);
      Store.set('pending_image', { name: file.name, b64: b64.slice(0, 200) + '...', full: b64, type: file.type });
      toast('Rasm biriktirildi: ' + file.name);
      const inp = document.getElementById('chat-input');
      if (inp && !inp.value) inp.value = 'Bu screenshot/UI dan kod yasа (HTML/CSS yoki React).';
    };
    input.click();
  },
  toBase64(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  },
  consumeContext() {
    const img = Store.get('pending_image', null);
    if (!img) return '';
    Store.set('pending_image', null);
    return `\n\n[IMAGE_ATTACHED name="${img.name}" type="${img.type}"]\nUser attached a UI screenshot. Generate code from the described UI. Image data URL length: ${(img.full||'').length}. Describe structure and WRITE_FILE HTML/CSS.`;
  },
};

// ── 9-ish Voice input ──────────────────────────────────────────
const Voice = {
  rec: null,
  listening: false,
  start() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast('Brauzer ovozni qo\'llab-quvvatlamaydi'); return; }
    if (this.listening) { this.rec?.stop(); this.listening = false; toast('To\'xtatildi'); return; }
    this.rec = new SR();
    this.rec.lang = 'uz-UZ';
    this.rec.interimResults = false;
    this.rec.onresult = (e) => {
      const t = e.results[0][0].transcript;
      const inp = document.getElementById('chat-input');
      if (inp) inp.value = (inp.value + ' ' + t).trim();
      toast('Ovoz qabul qilindi');
    };
    this.rec.onerror = () => { this.listening = false; toast('Ovoz xatosi'); };
    this.rec.onend = () => { this.listening = false; };
    this.rec.start();
    this.listening = true;
    toast('Tinglanmoqda...');
  },
};

// ── Enhanced agents map ────────────────────────────────────────
Object.assign(AGENT_SYSTEMS || {}, {
  master: 'Master Agent: orchestrate planner→coder→reviewer. Prefer WRITE_FILE for deliverables.',
  planner: 'Planner Agent: roadmap, files to touch, risks. Short plan then hand off.',
  researcher: 'Research Agent: best practices and accurate info.',
  backend: 'Backend Agent: APIs, DB, auth, scalability.',
  frontend: 'Frontend Agent: UI, responsive, accessibility.',
  designer: 'UI Designer Agent: mobile-first, visual hierarchy.',
  tester: 'Testing Agent: unit/integration tests.',
  security: 'Security Agent: vulnerabilities and fixes.',
  devops: 'DevOps Agent: CI/CD, Docker, deploy.',
  docs: 'Documentation Agent: README, API docs.',
  reviewer: 'Reviewer Agent: bugs, style, must-fix.',
  coder: 'Coding Agent: production code via WRITE_FILE.',
});

// Patch AI.send for auto-model + vision context
(function patchChatPremium() {
  if (typeof AI === 'undefined') return;
  const _send = AI.send.bind(AI);
  AI.send = async function (text) {
    const msg = (text || document.getElementById('chat-input')?.value || '').trim();
    if (msg.startsWith('/parallel ')) return ParallelAI.run(msg.slice(10));
    if (msg === '/preview') return Preview.open();
    if (msg === '/debug') return DebugCenter.analyze();
    if (ModelRouter.enableAuto && msg) {
      State.model = ModelRouter.pick(msg);
      const lab = document.getElementById('model-label');
      if (lab) lab.textContent = State.model.short;
    }
    const vision = Vision.consumeContext();
    if (vision) {
      const combined = msg + vision;
      return _send(combined);
    }
    return _send(text);
  };

  // Continue / Regenerate helpers
  AI.regenerate = async function () {
    const lastUser = [...State.chatHistory].reverse().find(m => m.role === 'user');
    if (!lastUser) { toast('Qayta yozish uchun xabar yo\'q'); return; }
    // remove last assistant
    while (State.chatHistory.length && State.chatHistory[State.chatHistory.length - 1].role === 'assistant') {
      State.chatHistory.pop();
    }
    await this.send(lastUser.content);
  };
  AI.continue = async function () {
    await this.send('Continue from where you left off. Complete remaining files with WRITE_FILE if needed.');
  };
})();

// Nav extension
(function navProduct() {
  const _nav = App.nav.bind(App);
  App.nav = function (id) {
    _nav(id);
    if (id === 'prompts') PromptLib.render();
    if (id === 'monitor') Monitor.render();
  };
})();

console.log('✓ product.js — premium modules');
