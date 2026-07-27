/**
 * OmniBrain — Master Orchestrator
 *
 * handle(userMessage) → intent → context → plan → model → parse → tools → critic
 * Self-* → self pipeline (+ minimal agent team)
 *
 * deps (inject):
 *   AIRouter  — { chat(messages): Promise }
 *   Git       — listRepos, listFiles, getFileContent, pushFile...
 *   FS, PM, DiffView, Deploy, SelfImport, SelfHeal, Store
 *   onStatus(msg), onMessage({role, content}), getMessages()
 */

import { classifyIntent, isSelfIntent } from './intent.js';
import { buildContext } from './context.js';
import { plan } from './planner.js';
import { parseTools, executeTools } from './tools.js';
import { review, MAX_RETRIES } from './critic.js';
import { runSelfPipeline } from './self.js';
import { IDENTITY, canWritePath, isSelfRepo } from './identity.js';
import { auditWrite, maskSecrets, escapeHtml } from './safety.js';

/**
 * @param {object} deps
 * @returns {object} Brain API
 */
export function createBrain(deps = {}) {
  const state = {
    phase: 'IDLE',
    lastIntent: null,
    lastPlan: null,
  };

  async function handle(userMessage) {
    const text = (userMessage || '').trim();
    if (!text) return { ok: false, error: 'Bo\'sh xabar' };

    state.phase = 'RECEIVE_MESSAGE';
    deps.onStatus?.('…');

    const classified = classifyIntent(text);
    state.lastIntent = classified.intent;
    state.phase = 'CLASSIFY_INTENT';

    if (classified.slash === '/clear') {
      deps.clearChat?.();
      deps.onMessage?.({ role: 'assistant', content: 'Chat tozalandi.' });
      state.phase = 'IDLE';
      return { ok: true, intent: 'command' };
    }

    if (classified.slash === '/sync') {
      await deps.SB?.syncAll?.();
      state.phase = 'IDLE';
      return { ok: true, intent: 'command' };
    }

    if (classified.slash === '/pull') {
      await deps.SB?.pullAll?.();
      state.phase = 'IDLE';
      return { ok: true, intent: 'command' };
    }

    if (isSelfIntent(classified.intent) || classified.slash === '/self' || classified.slash === '/rebuild') {
      state.phase = 'SELF_PIPELINE';
      const mode =
        classified.intent.startsWith('self_')
          ? classified.intent
          : classified.slash === '/rebuild'
            ? 'self_rebuild'
            : classified.slash === '/fix'
              ? 'self_heal'
              : 'self_import';

      const result = await runSelfPipeline({
        mode,
        userMessage: text,
        deps: enrichDeps(deps),
      });
      state.phase = 'IDLE';
      return result;
    }

    if (classified.slash === '/fix' && deps.SelfHeal?.analyze) {
      await deps.SelfHeal.analyze();
      state.phase = 'IDLE';
      return { ok: true, intent: 'self_heal' };
    }

    state.phase = 'BUILD_CONTEXT';
    const messages = deps.getMessages?.() || [];
    const project = deps.PM?.current?.() || null;

    const ctxMessages = await buildContext({
      intent: classified.intent,
      messages: [...messages, { role: 'user', content: text }],
      project,
      deps,
    });

    state.phase = 'PLAN';
    const thePlan = plan({ intent: classified.intent, text });
    state.lastPlan = thePlan;

    if (thePlan.type === 'multi' && thePlan.steps.length > 1) {
      deps.onStatus?.(`Reja: ${thePlan.steps.join(' → ')}`);
    }

    state.phase = 'CALL_LLM';
    if (!deps.AIRouter?.chat) {
      deps.onMessage?.({
        role: 'assistant',
        content: 'AIRouter ulanmagan. Sozlamalarda API kalit kiriting yoki Pollinations ishlatiladi.',
      });
      state.phase = 'IDLE';
      return { ok: false, error: 'no_router' };
    }

    let attempt = 0;
    let last = null;

    while (attempt <= MAX_RETRIES) {
      attempt++;
      try {
        const raw = await deps.AIRouter.chat(ctxMessages);
        const rawText =
          typeof raw === 'string'
            ? raw
            : raw?.choices?.[0]?.message?.content || raw?.content || '';

        state.phase = 'PARSE_RESPONSE';
        const { text: answer, tools } = parseTools(rawText);

        state.phase = 'EXECUTE_TOOLS';
        const { results, pendingApproval } = await executeTools(tools, {
          ...enrichDeps(deps),
          onStatus: deps.onStatus,
        });

        state.phase = 'CRITIC';
        const criticResult = review({ text: answer, tools, toolResults: results });
        last = { answer: criticResult.maskedText || answer, tools, results, pendingApproval, criticResult };

        if (criticResult.shouldRetry && attempt <= MAX_RETRIES) {
          deps.onStatus?.(`Qayta urinish ${attempt}/${MAX_RETRIES}...`);
          continue;
        }

        const display = criticResult.issues.length
          ? `${last.answer}\n\n_(Critic: ${criticResult.issues.join('; ')})_`
          : last.answer;

        deps.onMessage?.({ role: 'assistant', content: display || '…' });
        state.phase = 'IDLE';
        return { ok: true, intent: classified.intent, plan: thePlan, ...last };
      } catch (err) {
        deps.onStatus?.(`Xato: ${err.message}`);
        if (attempt > MAX_RETRIES) {
          deps.onMessage?.({
            role: 'assistant',
            content: `❌ AI so\'rov xatosi: ${err.message}`,
          });
          state.phase = 'IDLE';
          return { ok: false, error: err.message };
        }
      }
    }

    state.phase = 'IDLE';
    return { ok: false, error: 'retry_exhausted', last };
  }

  function enrichDeps(d) {
    return {
      ...d,
      canWritePath,
      isSelfRepo,
      auditWrite,
      IDENTITY,
    };
  }

  return {
    handle,
    classifyIntent,
    getState: () => ({ ...state }),
    IDENTITY,
    runSelf: (mode, msg) =>
      runSelfPipeline({ mode, userMessage: msg || mode, deps: enrichDeps(deps) }),
    utils: { maskSecrets, escapeHtml, canWritePath, parseTools },
  };
}

if (typeof window !== 'undefined') {
  window.OmniBrain = { createBrain, IDENTITY };
}

export default { createBrain, IDENTITY };
