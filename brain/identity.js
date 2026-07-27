/**
 * OmniBrain — Identity
 * O'zini qaysi repo/branch ekanligini biladi.
 * Self-rebuild faqat shu scope ichida ishlaydi.
 */

export const IDENTITY = Object.freeze({
  name: 'OmniCode',
  version: '3.0.0',
  owner: 'xojasoipov-sketch',
  repo: 'Useg-kop',
  defaultBranch: 'claude/shuni-chuntr-va-qil-60bfra',
  /** Self-edit uchun ruxsat etilgan path prefikslari */
  allowedWritePrefixes: [
    'omnicode/',
    'app.html',
    'index.html',
    'proxy.js',
    'STRUCTURE.md',
    'CLAUDE.md',
    'omnicode/AI_CONTEXT.md',
    '.github/workflows/',
    'package.json',
    'start.sh',
    'setup.sh',
  ],
  /** Hech qachon yozilmaydigan path patternlari */
  forbiddenWritePatterns: [
    /^\.env$/i,
    /^\.env\./i,
    /secret/i,
    /credential/i,
    /private[_\-]?key/i,
    /id_rsa/i,
    /\.pem$/i,
  ],
});

/**
 * Path yozishga ruxsat berilganmi?
 * @param {string} path
 * @returns {{ ok: boolean, reason?: string }}
 */
export function canWritePath(path) {
  if (!path || typeof path !== 'string') {
    return { ok: false, reason: 'Bo\'sh path' };
  }
  const p = path.replace(/^\/+/, '').trim();
  for (const re of IDENTITY.forbiddenWritePatterns) {
    if (re.test(p)) {
      return { ok: false, reason: `Taqiqlangan path: ${p}` };
    }
  }
  const allowed = IDENTITY.allowedWritePrefixes.some(
    (prefix) => p === prefix.replace(/\/$/, '') || p.startsWith(prefix)
  );
  if (!allowed) {
    return { ok: false, reason: `Scope tashqarida: ${p}` };
  }
  return { ok: true };
}

/**
 * Self-repo ekanligini tekshirish
 */
export function isSelfRepo(owner, repo) {
  return (
    String(owner).toLowerCase() === IDENTITY.owner.toLowerCase() &&
    String(repo).toLowerCase() === IDENTITY.repo.toLowerCase()
  );
}
