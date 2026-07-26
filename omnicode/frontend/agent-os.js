'use strict';
// Agent OS — haqiqiy multi-step: har agent alohida AI chaqiruvi

const AgentOS = {
  running: false,

  SYSTEMS: {
    master: 'Siz Master Agent. Natijani birlashtiring, qisqa xulosa bering. WRITE_FILE ishlatmang — faqat yakuniy hisobot.',
    planner: 'Siz Planner Agent. Vazifani 3–7 bosqichga bo\'ling. Fayl ro\'yxati, risklar, arxitektura. Kod yozmang.',
    researcher: 'Siz Research Agent. Best practice va aniq texnik tavsiya. Qisqa.',
    coder: 'Siz Coder Agent. Production-ready kod. Har bir fayl uchun <WRITE_FILE path="...">...</WRITE_FILE>. To\'liq fayl.',
    frontend: 'Siz Frontend Agent. UI, responsive, mobile-first. WRITE_FILE bilan.',
    backend: 'Siz Backend Agent. API, auth, validatsiya. WRITE_FILE bilan.',
    designer: 'Siz UI/UX Agent. Layout, hierarchy, accessibility. WRITE_FILE CSS/HTML kerak bo\'lsa.',
    database: 'Siz Database Agent. Schema, SQL, Supabase. WRITE_FILE yoki SQL blok.',
    tester: 'Siz Testing Agent. Unit/integration test yozing. WRITE_FILE.',
    security: 'Siz Security Agent. XSS, injection, secrets, auth. Muammo + tuzatish. Kerak bo\'lsa WRITE_FILE.',
    optimizer: 'Siz Performance Agent. Bundle, render, query. WRITE_FILE minimal o\'zgarish.',
    devops: 'Siz DevOps Agent. Deploy, CI, env. WRITE_FILE config kerak bo\'lsa.',
    docs: 'Siz Documentation Agent. README qisqa. WRITE_FILE README.md.',
    reviewer: 'Siz Reviewer Agent. Oldingi kodni tekshiring: bug, style, must-fix. WRITE_FILE faqat tuzatish uchun.',
  },

  chainFor(intent) {
    const map = {
      create_project: ['planner', 'coder', 'reviewer'],
      generate_code: ['planner', 'coder', 'reviewer'],
      fix_bug: ['reviewer', 'coder', 'tester'],
      review: ['reviewer', 'security'],
      security: ['security', 'coder'],
      optimize: ['optimizer', 'coder'],
      test: ['tester'],
      create_api: ['planner', 'backend', 'tester'],
      create_db: ['database', 'backend'],
      build_ui: ['designer', 'frontend', 'reviewer'],
      deploy: ['devops'],
      analyze: ['planner', 'reviewer'],
      refactor: ['coder', 'reviewer'],
      docs: ['docs'],
      general: ['planner', 'coder'],
    };
    return map[intent] || ['planner', 'coder', 'reviewer'];
  },

  async runStep(name, task, priorContext, projectCtx) {
    const sys = this.SYSTEMS[name] || this.SYSTEMS.coder;
    const messages = [
      {
        role: 'system',
        content: sys + '\n\nTil: foydalanuvchi tilida (o\'zbekcha afzal). Qisqa va aniq.\n' +
          'Loyiha konteksti (qisqa):\n' + (projectCtx || '(yo\'q)').slice(0, 6000),
      },
      {
        role: 'user',
        content: `Vazifa:\n${task}\n\nOldingi agentlar natijasi:\n${(priorContext || '(birinchi agent)').slice(0, 8000)}\n\nO\'z qisminingizni bajaring.`,
      },
    ];
    return AIRouter.call(messages);
  },

  /**
   * To'liq multi-agent ishga tushirish
   * @param {string} task - foydalanuvchi so'rovi
   * @param {string[]} [agentList] - ixtiyoriy zanjir
   */
  async execute(task, agentList) {
    if (this.running) {
      toast('Agentlar allaqachon ishlayapti');
      return;
    }
    if (!task || !task.trim()) return;

    this.running = true;
    App.nav('ai');

    const intent = (typeof CodingBrain !== 'undefined')
      ? CodingBrain.detectIntent(task)
      : 'general';
    const chain = agentList || this.chainFor(intent);
    const projectCtx = State.projectId ? FS.context(State.projectId, 8000) : '';

    Activity?.setAgents?.(chain);
    AI.appendBubble('user', task, false);
    State.chatHistory.push({ role: 'user', content: task });

    AI.appendBubble(
      'ai',
      `**Agent OS** ishga tushdi\n\nIntent: \`${intent}\`\nZanjir: ${chain.map(a => '**' + a + '**').join(' → ')}`,
      false
    );

    let prior = '';
    const allWrites = [];

    try {
      for (let i = 0; i < chain.length; i++) {
        const name = chain[i];
        Activity?.showStatus?.(`${i + 1}/${chain.length} · ${name}...`);
        Activity?.setAgents?.(chain.slice(0, i + 1));

        const reply = await this.runStep(name, task, prior, projectCtx);
        const writes = FS.parseWrites(reply);
        if (writes.length) allWrites.push(...writes);

        const clean = FS.stripCommands(reply);
        AI.appendBubble(
          'ai',
          `### ${name.toUpperCase()} (${i + 1}/${chain.length})\n\n${clean || '_(fayl o\'zgarishlari tayyor)_'}`,
          writes.length > 0
        );

        prior += `\n\n[${name.toUpperCase()}]\n${reply.slice(0, 3000)}`;
        State.chatHistory.push({ role: 'assistant', content: `[${name}] ${reply.slice(0, 1500)}` });
      }

      // Master xulosa
      Activity?.showStatus?.('Master xulosa...');
      try {
        const summary = await this.runStep(
          'master',
          task,
          prior.slice(0, 6000),
          ''
        );
        AI.appendBubble('ai', `### YAKUN\n\n${summary}`, false);
        State.chatHistory.push({ role: 'assistant', content: summary });
      } catch {}

      if (allWrites.length) {
        // unique by path (oxirgi versiya)
        const map = {};
        for (const w of allWrites) map[w.path] = w;
        State.pendingWrites = Object.values(map);
        Activity?.recordWrites?.(State.pendingWrites);
        AI.appendBubble(
          'ai',
          `**${State.pendingWrites.length} fayl** qo\'llashga tayyor. Pastdagi tugma yoki Diff orqali saqlang.`,
          true
        );
        toast(State.pendingWrites.length + ' fayl tayyor');
      } else {
        toast('Agent OS yakunlandi');
      }

      if (typeof SelfImport !== 'undefined') {
        SelfImport.saveState({
          goal: intent,
          summary: task.slice(0, 200),
        }).catch(() => {});
      }
    } catch (e) {
      AI.appendBubble('ai', '❌ Agent OS: ' + (e.message || e), false);
      toast(e.message || 'Xato');
    } finally {
      Activity?.hideStatus?.();
      this.running = false;
    }
  },
};

// Agents.executeTask va pipeline ni AgentOS ga ulash
(function wireAgentOS() {
  if (typeof Agents === 'undefined') return;

  Agents.runPipeline = async function (task, agentList) {
    return AgentOS.execute(task, agentList);
  };

  const _exec = Agents.executeTask.bind(Agents);
  Agents.executeTask = async function () {
    const task = document.getElementById('agent-task-input')?.value.trim();
    if (!task) return;
    Sheet.close('agent-sheet');
    const name = Agents.current || 'coder';
    if (name === 'master') {
      return AgentOS.execute(task);
    }
    return AgentOS.execute(task, [name, 'reviewer']);
  };

  Agents.runMaster = function () {
    Agents.current = 'master';
    State.agent = 'master';
    document.getElementById('agent-sheet-title').textContent = 'Master Agent OS';
    document.getElementById('agent-task-input').placeholder = 'Loyiha maqsadini batafsil yozing...';
    Sheet.open('agent-sheet');
  };
})();

// Coding Brain: murakkab vazifada multi-agent
(function wireBrainToOS() {
  if (typeof CodingBrain === 'undefined' || typeof AI === 'undefined') return;

  const complex = new Set([
    'create_project', 'generate_code', 'fix_bug', 'create_api',
    'build_ui', 'refactor', 'security', 'analyze',
  ]);

  // Slash: /agents vazifa
  const _send = AI.send.bind(AI);
  AI.send = async function (text) {
    const raw = (text || document.getElementById('chat-input')?.value || '').trim();
    if (!raw) return _send(text);

    if (raw.startsWith('/agents ') || raw.startsWith('/os ')) {
      const task = raw.replace(/^\/(agents|os)\s+/, '');
      return AgentOS.execute(task);
    }

    const intent = CodingBrain.detectIntent(raw);
    // Uzun yoki murakkab so'rov → multi-agent
    const useOS =
      complex.has(intent) &&
      raw.length > 40 &&
      !raw.startsWith('/parallel');

    if (useOS && !AgentOS.running) {
      const inp = document.getElementById('chat-input');
      if (!text && inp) inp.value = '';
      // composer context
      let task = raw;
      if (typeof Composer !== 'undefined') {
        task += Composer.consume() || '';
      }
      return AgentOS.execute(task);
    }

    return _send(text);
  };
})();

console.log('✓ agent-os.js — multi-agent OS');
