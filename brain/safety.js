/**
 * OmniBrain — Safety Gate
 * Secret, XSS, xavfli path filtri.
 */

const SECRET_PATTERNS = [
  /\b(sk-or-v1-[a-zA-Z0-9]{20,})\b/g,
  /\b(sk-ant-[a-zA-Z0-9\-_]{20,})\b/g,
  /\b(gsk_[a-zA-Z0-9]{20,})\b/g,
  /\b(ghp_[a-zA-Z0-9]{20,})\b/g,
  /\b(github_pat_[a-zA-Z0-9_]{20,})\b/g,
  /\b(AIza[0-9A-Za-z\-_]{20,})\b/g,
  /\b(xox[baprs]-[0-9A-Za-z\-]{10,})\b/g,
  /\b(Bearer\s+[A-Za-z0-9\-._~+/]+=*)\b/gi,
  /\b(api[_-]?key\s*[:=]\s*['\"][^'\"]{8,}['\"])/gi,
];

/**
 * Matndan secretlarni maskalash
 * @param {string} text
 * @returns {{ text: string, found: boolean }}
 */
export function maskSecrets(text) {
  if (!text || typeof text !== 'string') return { text: text || '', found: false };
  let found = false;
  let out = text;
  for (const re of SECRET_PATTERNS) {
    out = out.replace(re, () => {
      found = true;
      return '[SECRET_MASKED]';
    });
  }
  return { text: out, found };
}

/**
 * AI javobidagi HTML ni xavfsiz ko'rsatish uchun escape
 */
export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#39;');
}

/**
 * Tool yozuvi xavfsizmi?
 */
export function auditWrite({ path, content, owner, repo }, { canWritePath, isSelfRepo }) {
  const issues = [];
  if (owner && repo && !isSelfRepo(owner, repo)) {
    issues.push(`Self-rebuild faqat o'z reposida: ${owner}/${repo}`);
  }
  const pathCheck = canWritePath(path);
  if (!pathCheck.ok) issues.push(pathCheck.reason);
  const { found } = maskSecrets(content || '');
  if (found) issues.push('Kontentda secret topildi — yozish taqiqlanadi');
  return { ok: issues.length === 0, issues };
}
