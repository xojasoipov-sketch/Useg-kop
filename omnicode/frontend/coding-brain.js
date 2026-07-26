'use strict';
// Principal AI Coding Brain — senior engineer pipeline (not a chatbot)

const CodingBrain = {
  INTENTS: [
    'create_project', 'generate_code', 'explain', 'fix_bug', 'review',
    'deploy', 'create_api', 'create_db', 'build_ui', 'analyze', 'test',
    'docs', 'refactor', 'optimize', 'security', 'general',
  ],

  detectIntent(text) {
    const t = (text || '').toLowerCase();
    if (/deploy|joylashtir|push.*prod|live url/.test(t)) return 'deploy';
    if (/fix|bug|xato|error|crash|tuzat/.test(t)) return 'fix_bug';
    if (/review|tekshir|audit code/.test(t)) return 'review';
    if (/security|xss|injection|auth/.test(t)) return 'security';
    if (/optim|performance|tezlashtir/.test(t)) return 'optimize';
    if (/test|unit test|jest|vitest/.test(t)) return 'test';
    if (/api|endpoint|rest|graphql/.test(t)) return 'create_api';
    if (/database|sql|supabase|schema|migration/.test(t)) return 'create_db';
    if (/ui|frontend|react|css|layout|design/.test(t)) return 'build_ui';
    if (/explain|tushuntir|nima qiladi/.test(t)) return 'explain';
    if (/refactor|tozala|clean/.test(t)) return 'refactor';
    if (/docs|readme|dokument/.test(t)) return 'docs';
    if (/analyze|tahlil|architecture/.test(t)) return 'analyze';
    if (/new project|yangi loyiha|create project|scaffold/.test(t)) return 'create_project';
    if (/code|yoz|generate|build|implement|yarat/.test(t)) return 'generate_code';
    return 'general';
  },

  collectContext() {
    const projectId = State.projectId;
    const p = projectId ? PM.get(projectId) : null;
    const files = projectId ? FS.index(projectId).slice(0, 80) : [];
    const mem = (typeof SelfImport !== 'undefined' && SelfImport.getLocalState)
      ? SelfImport.getLocalState() : {};
    const keys = Store.get('keys', {});
    return {
      projectId,
      projectName: p?.name || null,
      template: p?.template || null,
      github: p?.github || null,
      fileCount: files.length,
      files: files.slice(0, 40),
      openFile: State.openFile || null,
      model: State.model?.short || State.model?.id || '',
      memory: { goal: mem.goal || '', summary: (mem.summary || '').slice(0, 400) },
      recentChat: (State.chatHistory || []).slice(-6).map(m => m.role + ': ' + String(m.content || '').slice(0, 120)),
      hasGithub: !!keys.github,
      hasSupabase: !!(keys.supabaseUrl && keys.supabaseAnon),
      orKeys: [keys.or1, keys.or2, keys.or3, keys.or4].filter(Boolean).length,
    };
  },

  agentChain(intent) {
    const map = {
      create_project: ['planner', 'frontend', 'backend', 'docs'],
      generate_code: ['planner', 'coder', 'reviewer'],
      fix_bug: ['reviewer', 'coder', 'tester'],
      review: ['reviewer', 'security'],
      security: ['security', 'coder'],
      optimize: ['optimizer', 'coder'],
      test: ['tester', 'coder'],
      create_api: ['backend', 'tester', 'docs'],
      create_db: ['backend', 'docs'],
      build_ui: ['designer', 'frontend', 'reviewer'],
      deploy: ['devops', 'tester'],
      analyze: ['planner', 'reviewer'],
      refactor: ['coder', 'reviewer'],
      docs: ['docs'],
      explain: ['coder'],
      general: ['planner', 'coder'],
    };
    return map[intent] || ['planner', 'coder', 'reviewer'];
  },

  systemPrompt(intent, ctx) {
    const agents = this.agentChain(intent).join(' → ');
    return `You are the Principal Coding Brain of OmniCode / SadiPrime inside a Telegram Mini App.
You are NOT a chatbot. You are a senior software engineer.

PIPELINE (always follow mentally):
Intent → Context → Memory → Project Analysis → Plan → Agents → Code → Self-Review → Security → Optimize → Test → Response

Current INTENT: ${intent}
Agent workflow: ${agents}

CONTEXT:
${JSON.stringify(ctx, null, 0)}

RULES:
- Production-ready code only. SOLID, clean architecture where sensible.
- Prefer minimal, correct changes over large rewrites.
- Use <WRITE_FILE path="relative/path">full file content</WRITE_FILE> for every file you create or change.
- Never put secrets, service_role keys, or real API keys in code.
- For Telegram Mini App: mobile-first, small bundles, localStorage or Supabase via anon key only.
- Before code: short Understanding + Plan (3–7 steps).
- After code: brief Review + Security notes + Next step.
- Match user language (Uzbek/Russian/English).
- If critical info missing, ask up to 3 sharp questions — then deliver.

OUTPUT STRUCTURE:
1. Understanding
2. Plan
3. Architecture (if relevant)
4. Agents used: ${agents}
5. Code (WRITE_FILE tags)
6. Review
7. Next Recommended Step`;
  },

  /** Main entry — wraps user message with brain pipeline */
  buildMessages(userText) {
    const intent = this.detectIntent(userText);
    const ctx = this.collectContext();
    Activity?.setAgents?.(this.agentChain(intent));
    Activity?.showStatus?.('Brain: ' + intent + '…');

    // model hint
    if (typeof ModelRouter !== 'undefined' && ModelRouter.enableAuto) {
      State.model = ModelRouter.pick(intent + ' ' + userText);
      const lab = document.getElementById('model-label');
      if (lab) lab.textContent = State.model.short || State.model.id;
    }

    const projectCtx = ctx.projectId
      ? FS.context(ctx.projectId, 10000)
      : '(no project selected — may scaffold or ask to create)';

    return {
      intent,
      ctx,
      messages: [
        { role: 'system', content: this.systemPrompt(intent, ctx) },
        ...State.chatHistory.slice(-8),
        {
          role: 'user',
          content: `USER REQUEST:\n${userText}\n\nPROJECT FILES SNAPSHOT:\n${projectCtx}`,
        },
      ],
    };
  },

  async run(userText) {
    const { intent, messages } = this.buildMessages(userText);
    try {
      const reply = await AIRouter.call(messages);
      Activity?.hideStatus?.();

      // memory update
      if (typeof SelfImport !== 'undefined') {
        SelfImport.saveState({
          goal: intent,
          summary: userText.slice(0, 200),
        }).catch(() => {});
      }
      if (typeof SB !== 'undefined' && SB.ready()) {
        SB.saveSession({ goal: intent, summary: userText.slice(0, 160) }).catch(() => {});
      }

      // deploy shortcut
      if (intent === 'deploy' && typeof Deploy !== 'undefined') {
        // still return AI plan; user can confirm push
      }

      return reply;
    } catch (e) {
      Activity?.hideStatus?.();
      throw e;
    }
  },
};

// Wire into AI.send — use brain for coding intents
(function wireCodingBrain() {
  if (typeof AI === 'undefined') return;
  const _send = AI.send.bind(AI);
  AI.send = async function (text) {
    const raw = (text || document.getElementById('chat-input')?.value || '').trim();
    if (!raw) return _send(text);

    // slash commands stay on existing handlers if product.js already wrapped
    if (raw.startsWith('/parallel') || raw === '/preview' || raw === '/debug') {
      return _send(text);
    }

    const intent = CodingBrain.detectIntent(raw);
    // light intents can still use full brain
    const useBrain = intent !== 'general' || raw.length > 20;

    if (!useBrain) return _send(text);

    // Custom path mirroring AI.send UI but with brain messages
    const inp = document.getElementById('chat-input');
    if (!text && inp) inp.value = '';
    AI.appendBubble('user', raw, false);
    State.chatHistory.push({ role: 'user', content: raw });

    Activity?.showStatus?.('Coding Brain…');
    try {
      const { messages } = CodingBrain.buildMessages(raw);
      // include vision if any
      if (typeof Vision !== 'undefined') {
        const v = Vision.consumeContext();
        if (v) messages[messages.length - 1].content += v;
      }
      const reply = await AIRouter.call(messages);
      Activity?.hideStatus?.();

      const writes = FS.parseWrites(reply);
      if (writes.length) {
        State.pendingWrites = writes;
        Activity?.recordWrites?.(writes);
        AI.appendBubble('ai', reply, true);
        toast(writes.length + ' fayl tayyor');
      } else {
        AI.appendBubble('ai', reply, false);
      }
      State.chatHistory.push({ role: 'assistant', content: reply });

      if (typeof SelfImport !== 'undefined') {
        SelfImport.saveState({ goal: CodingBrain.detectIntent(raw), summary: raw.slice(0, 180) }).catch(() => {});
      }
    } catch (e) {
      Activity?.hideStatus?.();
      AI.appendBubble('ai', '❌ ' + (e.message || e), false);
      toast(e.message || 'Xato');
    }
  };
})();

console.log('✓ coding-brain.js');
