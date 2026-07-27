/**
 * OmniBrain — Self-Bootstrap Pipeline
 * O'zini GitHubdan o'qish → tahlil → tahrir → tasdiq → push → deploy hint
 */

import { IDENTITY, canWritePath, isSelfRepo } from './identity.js';
import { TEAM_ROLES } from './planner.js';
import { parseTools, executeTools, TOOL_PROTOCOL_DOC } from './tools.js';
import { review, MAX_RETRIES } from './critic.js';
import { auditWrite, maskSecrets } from './safety.js';

/**
 * Self-rebuild / self-heal orchestrator
 */
export async function runSelfPipeline(opts) {
  const { mode, userMessage, deps } = opts;
  const { onStatus, onMessage, AIRouter, Git } = deps;
  const log = (msg) => onStatus?.(msg);

  log(`Identity: ${IDENTITY.owner}/${IDENTITY.repo}@${IDENTITY.defaultBranch}`);

  if (!deps.Git) {
    return fail(onMessage, "GitHub moduli yo'q. Sozlamalarda GitHub token kiriting.");
  }

  log("GitHubdan tuzilma o'qilmoqda...");
  let tree;
  try {
    tree = await Git.listFiles?.(IDENTITY.owner, IDENTITY.repo, '');
    if (!tree && Git.listFiles) {
      tree = await Git.listFiles(IDENTITY.owner, IDENTITY.repo, 'omnicode');
    }
  } catch (e) {
    return fail(onMessage, `GitHub o'qib bo'lmadi: ${e.message}. Token va repo huquqini tekshiring.`);
  }

  if (mode === 'self_import') {
    log('Import...');
    if (deps.SelfImport?.run) {
      await deps.SelfImport.run();
      onMessage?.({ role: 'assistant', content: "O'z kodi import qilindi (SelfImport)." });
      return { ok: true, mode };
    }
    onMessage?.({
      role: 'assistant',
      content: `Tuzilma:\n\`\`\`\n${summarizeTree(tree)}\n\`\`\`\nKeyingi qadam: kerakli fayllarni GH_READ_FILE bilan o'qing.`,
    });
    return { ok: true, mode, tree };
  }

  const teamEnabled = mode === 'self_rebuild' || mode === 'self_heal' || mode === 'self_analyze';

  if (teamEnabled && AIRouter?.chat) {
    return runTeam({ mode, userMessage, tree, deps, log, onMessage });
  }

  return runSingleSelf({ mode, userMessage, tree, deps, log, onMessage });
}

async function runTeam({ mode, userMessage, tree, deps, log, onMessage }) {
  const { AIRouter } = deps;
  const treeSummary = summarizeTree(tree);

  log('Tadqiqotchi...');
  const researchPrompt = [
    { role: 'system', content: TOOL_PROTOCOL_DOC + '\n\n' + TEAM_ROLES.researcher.systemExtra },
    {
      role: 'user',
      content: `Mode: ${mode}\nRepo daraxti:\n${treeSummary}\n\nFoydalanuvchi: ${userMessage}\n\nMuhim fayllarni o'qib, bo'shliqlar va xatolarni xulosa qil. Kerak bo'lsa GH_READ_FILE ishlat.`,
    },
  ];
  let research = await callWithTools(researchPrompt, deps, log);
  research = await maybeFollowTools(research, deps, log);

  log('Dasturchi...');
  const coderPrompt = [
    { role: 'system', content: TOOL_PROTOCOL_DOC + '\n\n' + TEAM_ROLES.coder.systemExtra },
    {
      role: 'user',
      content: `Mode: ${mode}\nTadqiqot xulosasi:\n${research.text}\n\nTool natijalari:\n${JSON.stringify(research.toolResults || [], null, 2).slice(0, 8000)}\n\nEndi aniq WRITE_FILE yoki GH_WRITE_FILE taklif qil. Har bir o'zgarish uchun path va to'liq kontent.`,
    },
  ];
  let coded = await callWithTools(coderPrompt, deps, log);

  log('Tekshiruvchi...');
  const reviewPrompt = [
    { role: 'system', content: TEAM_ROLES.reviewer.systemExtra },
    {
      role: 'user',
      content: `Coder javobi:\n${coded.text}\n\nPending writes:\n${JSON.stringify(coded.pendingApproval || [], null, 2).slice(0, 6000)}\n\nXavf bormi? Secret? Scope? Qisqa verdict: APPROVE yoki REJECT + sabab.`,
    },
  ];
  const verdict = await AIRouter.chat(reviewPrompt);
  const verdictText = extractText(verdict);

  const critic = review({
    text: coded.text,
    tools: coded.tools,
    toolResults: coded.toolResults,
  });

  const finalText = [
    `## Self pipeline: ${mode}`,
    '',
    '### Tadqiqot',
    research.text || "_bo'sh_",
    '',
    "### O'zgarishlar taklifi",
    coded.text || "_yo'q_",
    '',
    '### Review',
    verdictText,
    '',
    critic.issues.length ? `### Critic\n- ${critic.issues.join('\n- ')}` : '### Critic\nOK',
    '',
    coded.pendingApproval?.length
      ? 'Yozuvlar DiffView da tasdiq kutmoqda. Push/deploy faqat siz tasdiqlagach.'
      : "Yozuv yo'q yoki barchasi bloklandi.",
  ].join('\n');

  onMessage?.({ role: 'assistant', content: finalText });

  return {
    ok: true,
    mode,
    pendingApproval: coded.pendingApproval || [],
    critic,
  };
}

async function runSingleSelf({ mode, userMessage, tree, deps, log, onMessage }) {
  const { AIRouter } = deps;
  log('Single-shot self...');
  const messages = [
    { role: 'system', content: TOOL_PROTOCOL_DOC },
    {
      role: 'user',
      content: `Mode: ${mode}\nDaraxt:\n${summarizeTree(tree)}\n\n${userMessage}`,
    },
  ];
  let result = await callWithTools(messages, deps, log);
  result = await maybeFollowTools(result, deps, log);
  onMessage?.({ role: 'assistant', content: result.text || 'Bajarildi.' });
  return { ok: true, mode, ...result };
}

async function callWithTools(messages, deps, log) {
  const raw = await deps.AIRouter.chat(messages);
  const text = extractText(raw);
  const { text: clean, tools } = parseTools(text);
  const { results, pendingApproval } = await executeTools(tools, {
    ...deps,
    onStatus: log,
    canWritePath,
    isSelfRepo,
    auditWrite,
    IDENTITY,
  });
  return { text: clean, tools, toolResults: results, pendingApproval, rawText: text };
}

async function maybeFollowTools(prev, deps, log, depth = 0) {
  if (depth >= MAX_RETRIES) return prev;
  const needRead = (prev.toolResults || []).some((r) => r.ok && r.tool?.includes('READ'));
  if (!needRead || !prev.tools?.length) return prev;
  return prev;
}

function extractText(resp) {
  if (!resp) return '';
  if (typeof resp === 'string') return resp;
  return (
    resp.choices?.[0]?.message?.content ||
    resp.content ||
    resp.text ||
    JSON.stringify(resp)
  );
}

function summarizeTree(tree) {
  if (!tree) return '(daraxt olinmadi)';
  if (typeof tree === 'string') return tree.slice(0, 4000);
  if (Array.isArray(tree)) {
    return tree
      .map((f) => (typeof f === 'string' ? f : f.path || f.name || JSON.stringify(f)))
      .slice(0, 80)
      .join('\n');
  }
  return JSON.stringify(tree, null, 2).slice(0, 4000);
}

function fail(onMessage, msg) {
  onMessage?.({ role: 'assistant', content: `Xato: ${msg}` });
  return { ok: false, error: msg };
}
