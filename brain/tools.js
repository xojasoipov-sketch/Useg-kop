/**
 * OmniBrain — Tool Protocol Parser & Executor
 * Multi-file + RUN_CMD sandbox terminal
 */

import { runCommand, TERMINAL_TOOL_DOC } from './terminal.js';

const TAG_SPECS = [
  {
    name: 'GH_LIST_REPOS',
    selfClosing: true,
    needsApproval: false,
    re: /<GH_LIST_REPOS\s*\/>/gi,
  },
  {
    name: 'GH_LIST_FILES',
    selfClosing: true,
    needsApproval: false,
    re: /<GH_LIST_FILES\b([^>]*)\/>/gi,
  },
  {
    name: 'GH_READ_FILE',
    selfClosing: true,
    needsApproval: false,
    re: /<GH_READ_FILE\b([^>]*)\/>/gi,
  },
  {
    name: 'GH_CREATE_REPO',
    selfClosing: true,
    needsApproval: true,
    re: /<GH_CREATE_REPO\b([^>]*)\/>/gi,
  },
  {
    name: 'GH_WRITE_FILE',
    selfClosing: false,
    needsApproval: true,
    re: /<GH_WRITE_FILE\b([^>]*)>([\s\S]*?)<\/GH_WRITE_FILE>/gi,
  },
  {
    name: 'WRITE_FILE',
    selfClosing: false,
    needsApproval: true,
    re: /<WRITE_FILE\b([^>]*)>([\s\S]*?)<\/WRITE_FILE>/gi,
  },
  {
    name: 'RUN_CMD',
    selfClosing: false,
    needsApproval: false,
    re: /<RUN_CMD\b([^>]*)>([\s\S]*?)<\/RUN_CMD>/gi,
  },
];

function parseAttrs(attrStr) {
  const attrs = {};
  if (!attrStr) return attrs;
  const re = /([a-zA-Z_][\w-]*)\s*=\s*"([^"]*)"/g;
  let m;
  while ((m = re.exec(attrStr)) !== null) {
    attrs[m[1]] = m[2];
  }
  return attrs;
}

export function parseTools(responseText) {
  const tools = [];
  let text = responseText || '';

  for (const spec of TAG_SPECS) {
    const re = new RegExp(spec.re.source, spec.re.flags);
    let m;
    while ((m = re.exec(responseText || '')) !== null) {
      const attrs = parseAttrs(m[1] || '');
      const content = spec.selfClosing ? undefined : m[2] || '';
      tools.push({
        name: spec.name,
        attrs,
        content,
        needsApproval: spec.needsApproval,
        raw: m[0],
      });
      text = text.replace(m[0], '');
    }
  }

  text = text.replace(/\n{3,}/g, '\n\n').trim();
  return { text, tools };
}

export async function executeTools(tools, deps) {
  const results = [];
  const pendingApproval = [];
  const {
    Git,
    FS,
    PM,
    DiffView,
    onStatus,
    canWritePath,
    isSelfRepo,
    auditWrite,
    IDENTITY,
  } = deps;

  for (const tool of tools.slice(0, 8)) {
    try {
      if (tool.needsApproval) {
        const path = tool.attrs.path || tool.attrs.name || '';
        const owner = tool.attrs.owner || IDENTITY.owner;
        const repo = tool.attrs.repo || IDENTITY.repo;
        const audit = auditWrite(
          { path, content: tool.content, owner, repo },
          { canWritePath, isSelfRepo }
        );
        if (!audit.ok) {
          results.push({ tool: tool.name, ok: false, error: audit.issues.join('; ') });
          onStatus?.('⛔ ' + tool.name + ': ' + audit.issues[0]);
          continue;
        }
        pendingApproval.push(tool);
        onStatus?.('⏳ Tasdiq: ' + tool.name + ' ' + path);
        continue;
      }

      onStatus?.('🔧 ' + tool.name + '...');
      let result;

      switch (tool.name) {
        case 'GH_LIST_REPOS':
          result = await Git?.listRepos?.();
          break;
        case 'GH_LIST_FILES':
          result = await Git?.listFiles?.(
            tool.attrs.owner || IDENTITY.owner,
            tool.attrs.repo || IDENTITY.repo,
            tool.attrs.path || ''
          );
          break;
        case 'GH_READ_FILE':
          result = await Git?.getFileContent?.(
            tool.attrs.owner || IDENTITY.owner,
            tool.attrs.repo || IDENTITY.repo,
            tool.attrs.path
          );
          break;
        case 'RUN_CMD': {
          const cmd = (tool.content || tool.attrs.cmd || '').trim();
          const out = runCommand(cmd, { FS, PM });
          result = out;
          onStatus?.(out.ok ? '$ ' + cmd : '✗ $ ' + cmd);
          break;
        }
        default:
          result = { skipped: true };
      }

      results.push({ tool: tool.name, ok: true, data: result });
    } catch (err) {
      results.push({ tool: tool.name, ok: false, error: err.message || String(err) });
      onStatus?.('✗ ' + tool.name + ': ' + err.message);
    }
  }

  if (pendingApproval.length && DiffView?.queue) {
    DiffView.queue(pendingApproval);
  }

  return { results, pendingApproval };
}

export const TOOL_PROTOCOL_DOC = `
Siz OmniCode AI coding assistantsiz. Javobda kerak bo'lsa quyidagi tool taglarini ishlating:

READ (avtomatik):
<GH_LIST_REPOS/>
<GH_LIST_FILES owner="xojasoipov-sketch" repo="Useg-kop" path="omnicode/frontend"/>
<GH_READ_FILE owner="xojasoipov-sketch" repo="Useg-kop" path="omnicode/frontend/brain/index.js"/>

TERMINAL sandbox (avtomatik, xavfsiz):
<RUN_CMD>ls</RUN_CMD>
<RUN_CMD>cat path/to/file.js</RUN_CMD>
<RUN_CMD>find auth</RUN_CMD>

WRITE (foydalanuvchi tasdiqlaydi, multi-file mumkin):
<WRITE_FILE path="relative/path.js">
...kod...
</WRITE_FILE>
<GH_WRITE_FILE owner="xojasoipov-sketch" repo="Useg-kop" path="omnicode/frontend/brain/index.js" message="feat: ...">
...kod...
</GH_WRITE_FILE>

Qoidalar:
- UI matnlari o'zbek tilida
- Secret, .env, token hech qachon yozma
- Self-edit faqat Useg-kop reposida
- Katta o'zgarishda avval qisqa reja yoz
- Bir nechta fayl uchun har biri alohida WRITE_FILE / GH_WRITE_FILE
- RUN_CMD da curl/sudo/node/python YO'Q — faqat ls/cat/find/...

${TERMINAL_TOOL_DOC}
`.trim();
