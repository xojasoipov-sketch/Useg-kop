/**
 * OmniBrain — Safe Terminal Sandbox
 * Haqiqiy OS shell YO'Q. Faqat virtual FS ustida whitelist buyruqlar.
 *
 * Ruxsat:
 *   help, clear, pwd, ls, cat, head, tail, echo, mkdir (virtual),
 *   touch, write, rm (faqat project files), wc, find, tree, whoami, date
 *
 * Taqiqlangan:
 *   curl, wget, ssh, eval, node, python, rm -rf /, chmod, sudo, ...
 */

const FORBIDDEN = [
  /\brm\s+-rf\s+[\/\~]/i,
  /\bsudo\b/i,
  /\bchmod\b/i,
  /\bchown\b/i,
  /\bcurl\b/i,
  /\bwget\b/i,
  /\bssh\b/i,
  /\bscp\b/i,
  /\beval\b/i,
  /\bexec\b/i,
  /\bnode\b/i,
  /\bpython\b/i,
  /\bperl\b/i,
  /\bruby\b/i,
  /\bbash\b/i,
  /\bsh\s+-c\b/i,
  /\bprocess\b/i,
  /\brequire\s*\(/i,
  /\bimport\s*\(/i,
  /\bfetch\s*\(/i,
  /\bXMLHttpRequest\b/i,
  /\blocalStorage\b/i,
  /\bsessionStorage\b/i,
  /\bindexedDB\b/i,
  /\bdocument\./i,
  /\bwindow\./i,
  /\bFunction\s*\(/i,
  /[`$]{/, // template injection attempts
];

const HELP = `OmniCode Terminal (sandbox)
Buyruqlar:
  help              — yordam
  clear             — ekranni tozalash
  pwd               — joriy path
  ls [path]         — fayllar ro'yxati
  cat <file>        — fayl o'qish
  head <file> [n]   — birinchi n satr (default 20)
  tail <file> [n]   — oxirgi n satr
  echo <text>       — matn chiqarish
  wc <file>         — satr/so'z/belgi
  find <query>      — nom bo'yicha qidirish
  tree              — daraxt
  whoami            — foydalanuvchi
  date              — sana
  write <file> <text> — faylga yozish (qisqa)
  rm <file>         — loyiha faylini o'chirish

Eslatma: haqiqiy shell yo'q. Faqat loyiha FS.`;

function forbidden(cmd) {
  for (const re of FORBIDDEN) {
    if (re.test(cmd)) return re.source;
  }
  return null;
}

function parseArgs(line) {
  const parts = [];
  let cur = '';
  let quote = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) {
      if (c === quote) quote = null;
      else cur += c;
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (/\s/.test(c)) {
      if (cur) {
        parts.push(cur);
        cur = '';
      }
    } else {
      cur += c;
    }
  }
  if (cur) parts.push(cur);
  return parts;
}

/**
 * @param {string} command
 * @param {object} ctx
 * @param {object} ctx.FS
 * @param {object} ctx.PM
 * @param {string} [ctx.cwd]
 * @returns {{ ok: boolean, output: string, cwd?: string }}
 */
export function runCommand(command, ctx = {}) {
  const raw = String(command || '').trim();
  if (!raw) return { ok: true, output: '' };

  const bad = forbidden(raw);
  if (bad) {
    return {
      ok: false,
      output: '⛔ Taqiqlangan buyruq/pattern: ' + bad + '\nSandbox: faqat xavfsiz FS buyruqlari.',
    };
  }

  // pipe / redirect blok
  if (/[|&;><`]/.test(raw) && !/^echo\s/.test(raw)) {
    return {
      ok: false,
      output: '⛔ Pipe/redirect/meta belgilar taqiqlangan.',
    };
  }

  const args = parseArgs(raw);
  const cmd = (args[0] || '').toLowerCase();
  const rest = args.slice(1);

  const project = ctx.PM?.current?.() || null;
  const projectId = project?.id;
  const FS = ctx.FS;

  const files = () => {
    if (!FS || !projectId) return {};
    const map = {};
    for (const p of FS.index(projectId) || []) {
      map[p] = FS.read(projectId, p);
    }
    return map;
  };

  switch (cmd) {
    case 'help':
    case '?':
      return { ok: true, output: HELP };

    case 'clear':
      return { ok: true, output: '__CLEAR__' };

    case 'pwd':
      return {
        ok: true,
        output: project ? '/project/' + (project.name || projectId) : '/(loyihа yoq)',
      };

    case 'whoami':
      return { ok: true, output: 'omnicode-sandbox' };

    case 'date':
      return { ok: true, output: new Date().toISOString() };

    case 'echo':
      return { ok: true, output: rest.join(' ') };

    case 'ls': {
      if (!projectId || !FS) {
        return { ok: false, output: "Loyiha tanlanmagan yoki FS yo'q" };
      }
      const all = FS.index(projectId) || [];
      const filter = rest[0] || '';
      const list = filter
        ? all.filter((p) => p.includes(filter) || p.startsWith(filter))
        : all;
      if (!list.length) return { ok: true, output: '(bo\'sh)' };
      return {
        ok: true,
        output: list
          .map((p) => {
            const c = FS.read(projectId, p);
            const n = c != null ? String(c).length : 0;
            return p.padEnd(40) + ' ' + n + 'b';
          })
          .join('\n'),
      };
    }

    case 'cat': {
      if (!rest[0]) return { ok: false, output: 'cat: fayl kerak' };
      if (!projectId || !FS) return { ok: false, output: 'Loyiha yo\'q' };
      const content = FS.read(projectId, rest[0]);
      if (content == null) return { ok: false, output: 'cat: topilmadi: ' + rest[0] };
      return { ok: true, output: String(content).slice(0, 50000) };
    }

    case 'head': {
      if (!rest[0]) return { ok: false, output: 'head: fayl kerak' };
      if (!projectId || !FS) return { ok: false, output: 'Loyiha yo\'q' };
      const content = FS.read(projectId, rest[0]);
      if (content == null) return { ok: false, output: 'head: topilmadi' };
      const n = Math.min(parseInt(rest[1], 10) || 20, 200);
      return {
        ok: true,
        output: String(content).split('\n').slice(0, n).join('\n'),
      };
    }

    case 'tail': {
      if (!rest[0]) return { ok: false, output: 'tail: fayl kerak' };
      if (!projectId || !FS) return { ok: false, output: 'Loyiha yo\'q' };
      const content = FS.read(projectId, rest[0]);
      if (content == null) return { ok: false, output: 'tail: topilmadi' };
      const n = Math.min(parseInt(rest[1], 10) || 20, 200);
      const lines = String(content).split('\n');
      return { ok: true, output: lines.slice(-n).join('\n') };
    }

    case 'wc': {
      if (!rest[0]) return { ok: false, output: 'wc: fayl kerak' };
      if (!projectId || !FS) return { ok: false, output: 'Loyiha yo\'q' };
      const content = FS.read(projectId, rest[0]);
      if (content == null) return { ok: false, output: 'wc: topilmadi' };
      const s = String(content);
      const lines = s.split('\n').length;
      const words = s.trim() ? s.trim().split(/\s+/).length : 0;
      return {
        ok: true,
        output: lines + '  ' + words + '  ' + s.length + '  ' + rest[0],
      };
    }

    case 'find': {
      if (!projectId || !FS) return { ok: false, output: 'Loyiha yo\'q' };
      const q = (rest[0] || '').toLowerCase();
      if (!q) return { ok: false, output: 'find: query kerak' };
      const hits = (FS.index(projectId) || []).filter((p) =>
        p.toLowerCase().includes(q)
      );
      return {
        ok: true,
        output: hits.length ? hits.join('\n') : '(topilmadi)',
      };
    }

    case 'tree': {
      if (!projectId || !FS) return { ok: false, output: 'Loyiha yo\'q' };
      const all = FS.index(projectId) || [];
      if (!all.length) return { ok: true, output: '.' };
      const lines = ['.'];
      all.sort().forEach((p, i) => {
        const last = i === all.length - 1;
        lines.push((last ? '└── ' : '├── ') + p);
      });
      return { ok: true, output: lines.join('\n') };
    }

    case 'write': {
      if (!rest[0]) return { ok: false, output: 'write: path kerak' };
      if (!projectId || !FS) return { ok: false, output: 'Loyiha yo\'q' };
      const text = rest.slice(1).join(' ');
      if (text.length > 20000) {
        return { ok: false, output: 'write: juda uzun (max 20k)' };
      }
      // path xavfsizligi
      if (rest[0].includes('..') || rest[0].startsWith('/')) {
        return { ok: false, output: 'write: yaroqsiz path' };
      }
      FS.write(projectId, rest[0], text);
      return { ok: true, output: 'OK wrote ' + rest[0] + ' (' + text.length + 'b)' };
    }

    case 'rm': {
      if (!rest[0]) return { ok: false, output: 'rm: path kerak' };
      if (!projectId || !FS) return { ok: false, output: 'Loyiha yo\'q' };
      if (rest[0].includes('..')) {
        return { ok: false, output: 'rm: yaroqsiz path' };
      }
      const map = StoreFiles(FS, projectId);
      if (!(rest[0] in map)) {
        return { ok: false, output: 'rm: topilmadi: ' + rest[0] };
      }
      delete map[rest[0]];
      // FS store orqali qayta yozish
      if (typeof FS._replaceAll === 'function') {
        FS._replaceAll(projectId, map);
      } else {
        // Store orqali
        try {
          const key = 'files_' + projectId;
          const raw = localStorage.getItem('oc_' + key);
          // use FS.write empty delete pattern via Store if available
        } catch {}
        // minimal: write empty then rely on index — better expose delete
        if (FS.delete) FS.delete(projectId, rest[0]);
        else {
          // fallback: overwrite store
          const files = {};
          for (const p of Object.keys(map)) {
            if (p !== rest[0]) files[p] = map[p];
          }
          // FS has no public replace — use write of remaining via Store pattern
          try {
            localStorage.setItem('oc_files_' + projectId, JSON.stringify(files));
          } catch (e) {
            return { ok: false, output: 'rm: ' + e.message };
          }
        }
      }
      return { ok: true, output: 'removed ' + rest[0] };
    }

    default:
      return {
        ok: false,
        output:
          'Noma\'lum buyruq: ' +
          cmd +
          '\nYordam uchun: help',
      };
  }
}

function StoreFiles(FS, projectId) {
  const map = {};
  for (const p of FS.index(projectId) || []) {
    map[p] = FS.read(projectId, p);
  }
  return map;
}

export const TERMINAL_TOOL_DOC = `
TERMINAL (sandbox, tasdiq shart emas, xavfsiz):
<RUN_CMD>ls</RUN_CMD>
<RUN_CMD>cat src/app.js</RUN_CMD>
<RUN_CMD>find auth</RUN_CMD>
Faqat whitelist: ls, cat, head, tail, echo, pwd, wc, find, tree, help, write, rm
Haqiqiy shell / curl / node / sudo YO'Q.
`.trim();

export default { runCommand, TERMINAL_TOOL_DOC };
