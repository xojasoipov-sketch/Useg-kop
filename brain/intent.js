/**
 * OmniBrain — Intent Classifier
 * Deterministic (regex/keyword). LLM kerak emas.
 */

const SLASH_MAP = {
  '/fix': 'self_heal',
  '/self': 'self_import',
  '/rebuild': 'self_rebuild',
  '/sync': 'command',
  '/pull': 'command',
  '/github': 'github',
  '/import': 'github',
  '/model': 'settings',
  '/clear': 'command',
  '/deploy': 'deploy',
};

const RULES = [
  {
    intent: 'self_rebuild',
    patterns: [
      /o'?zini\s+(0\s*dan\s+)?qur/i,
      /self[-\s]?rebuild/i,
      /o'?zingni\s+(qayta\s+)?qur/i,
      /o'?zini\s+yaxshila/i,
      /from\s+scratch/i,
    ],
  },
  {
    intent: 'self_heal',
    patterns: [
      /o'?zini\s+tuzat/i,
      /self[-\s]?heal/i,
      /xatoni?\s+tuzat/i,
      /bug\s*fix/i,
    ],
  },
  {
    intent: 'self_import',
    patterns: [
      /o'?z\s+kodini?\s+(github|git)/i,
      /self[-\s]?import/i,
      /o'?zini\s+o'?qish/i,
    ],
  },
  {
    intent: 'self_analyze',
    patterns: [
      /o'?zini\s+tahlil/i,
      /self[-\s]?analy/i,
      /tuzilmani?\s+ko'?r/i,
    ],
  },
  {
    intent: 'self_edit',
    patterns: [
      /o'?z\s+faylini?\s+tahrir/i,
      /o'?zingni\s+o'?zgartir/i,
      /self[-\s]?edit/i,
    ],
  },
  {
    intent: 'deploy',
    patterns: [
      /deploy/i,
      /joylashtir/i,
      /github\s*pages/i,
      /publish/i,
    ],
  },
  {
    intent: 'github',
    patterns: [
      /github/i,
      /repo(zitoriya|sitory)?/i,
      /push\s+qil/i,
      /pull\s+request/i,
      /commit/i,
      /branch/i,
    ],
  },
  {
    intent: 'fix',
    patterns: [
      /tuzat/i,
      /xato/i,
      /error/i,
      /bug/i,
      /ishlamayapti/i,
      /broken/i,
    ],
  },
  {
    intent: 'refactor',
    patterns: [
      /refactor/i,
      /tozala/i,
      /qayta\s+yoz/i,
      /solid/i,
      /optimallashtir/i,
    ],
  },
  {
    intent: 'code',
    patterns: [
      /yoz(ing)?/i,
      /qo'?sh/i,
      /implement/i,
      /yarat/i,
      /kod\s+yoz/i,
      /function/i,
      /komponent/i,
      /api\s+qil/i,
    ],
  },
  {
    intent: 'project',
    patterns: [
      /yangi\s+loyiha/i,
      /project\s+create/i,
      /loyiha\s+(och|switch)/i,
    ],
  },
  {
    intent: 'settings',
    patterns: [
      /sozlama/i,
      /api\s*key/i,
      /model\s+tanla/i,
      /kalit/i,
    ],
  },
];

/**
 * @param {string} text
 * @returns {{ intent: string, confidence: number, slash?: string, raw: string }}
 */
export function classifyIntent(text) {
  const raw = (text || '').trim();
  if (!raw) {
    return { intent: 'unknown', confidence: 0, raw };
  }

  if (raw.startsWith('/')) {
    const cmd = raw.split(/\s+/)[0].toLowerCase();
    const intent = SLASH_MAP[cmd] || 'command';
    return { intent, confidence: 1, slash: cmd, raw };
  }

  for (const rule of RULES) {
    for (const re of rule.patterns) {
      if (re.test(raw)) {
        return { intent: rule.intent, confidence: 0.85, raw };
      }
    }
  }

  return { intent: 'chat', confidence: 0.5, raw };
}

/** Self-* intentlar (Agent Team ishlatiladi) */
export function isSelfIntent(intent) {
  return String(intent).startsWith('self_');
}
