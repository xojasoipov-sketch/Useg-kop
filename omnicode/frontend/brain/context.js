/**
 * OmniBrain — Context Builder
 * Token budget bilan kontekst yig'adi.
 */

import { TOOL_PROTOCOL_DOC } from './tools.js';
import { IDENTITY } from './identity.js';
import { isSelfIntent } from './intent.js';

const DEFAULT_CHAT_N = 12;
const MAX_FILE_CHARS = 12000;
const MAX_TOTAL_CHARS = 48000;

/**
 * @param {object} opts
 * @param {string} opts.intent
 * @param {Array<{role:string, content:string}>} opts.messages
 * @param {object} opts.project — PM.current()
 * @param {object} opts.deps — { FS, Git, Store }
 */
export async function buildContext(opts) {
  const { intent, messages = [], project, deps = {} } = opts;
  const parts = [];

  parts.push({
    role: 'system',
    content: [
      TOOL_PROTOCOL_DOC,
      '',
      `Identity: ${IDENTITY.name} v${IDENTITY.version}`,
      `Self-repo: ${IDENTITY.owner}/${IDENTITY.repo}`,
      `Branch: ${IDENTITY.defaultBranch}`,
      project ? `Joriy loyiha: ${project.name || project.id}` : 'Loyiha tanlanmagan',
    ].join('\n'),
  });

  const recent = messages.slice(-DEFAULT_CHAT_N);
  for (const m of recent) {
    parts.push({ role: m.role, content: truncate(m.content, 4000) });
  }

  if (['code', 'fix', 'refactor', 'self_edit', 'self_heal', 'self_rebuild'].includes(intent)) {
    const fileCtx = await safeFileContext(deps, project);
    if (fileCtx) {
      parts.push({
        role: 'system',
        content: `Fayl konteksti:\n${fileCtx}`,
      });
    }
  }

  if (isSelfIntent(intent) || intent === 'github') {
    parts.push({
      role: 'system',
      content: [
        'Self-bootstrap: o\'z kodini GitHubdan o\'qib, tahrirlab, tasdiq bilan push qilishing mumkin.',
        'Avval GH_LIST_FILES / GH_READ_FILE bilan tuzilmani o\'rgan.',
        'Keyin plan yoz, so\'ng WRITE/GH_WRITE taklif qil.',
      ].join('\n'),
    });
  }

  return fitBudget(parts, MAX_TOTAL_CHARS);
}

async function safeFileContext(deps, project) {
  try {
    if (!deps.FS || !project?.id) return null;
    const ctx = deps.FS.context?.(project.id);
    if (!ctx) return null;
    return truncate(typeof ctx === 'string' ? ctx : JSON.stringify(ctx, null, 2), MAX_FILE_CHARS);
  } catch {
    return null;
  }
}

function truncate(s, max) {
  if (!s || s.length <= max) return s || '';
  return s.slice(0, max) + '\n…[qisqartirildi]';
}

function fitBudget(messages, maxChars) {
  let total = messages.reduce((n, m) => n + (m.content?.length || 0), 0);
  if (total <= maxChars) return messages;
  const out = [...messages];
  for (let i = 1; i < out.length - 1 && total > maxChars; i++) {
    if (out[i].role === 'system') continue;
    const before = out[i].content.length;
    out[i] = { ...out[i], content: truncate(out[i].content, 800) };
    total -= before - out[i].content.length;
  }
  return out;
}
