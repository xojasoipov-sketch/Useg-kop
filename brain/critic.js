/**
 * OmniBrain — Critic / Self-review
 */

import { maskSecrets } from './safety.js';

/**
 * @param {{ text?: string, tools?: Array, toolResults?: Array }} payload
 * @returns {{ ok: boolean, issues: string[], maskedText?: string, shouldRetry: boolean }}
 */
export function review(payload) {
  const issues = [];
  let shouldRetry = false;
  const text = payload.text || '';

  const { text: masked, found } = maskSecrets(text);
  if (found) {
    issues.push('Javobda secret aniqlandi — maskalandi');
  }

  for (const r of payload.toolResults || []) {
    if (!r.ok) {
      issues.push(`Tool xato: ${r.tool} — ${r.error || 'noma\'lum'}`);
      // Transient deb taxmin: network
      if (/timeout|429|503|network|fetch/i.test(r.error || '')) {
        shouldRetry = true;
      }
    }
  }

  // Yopilmagan tool tag qoldiq
  if (/<GH_[A-Z_]+|<WRITE_FILE/i.test(text) && (payload.tools || []).length === 0) {
    issues.push('Parse qilinmagan tool tag bor');
  }

  return {
    ok: issues.filter((i) => !i.includes('maskalandi')).length === 0,
    issues,
    maskedText: found ? masked : text,
    shouldRetry,
  };
}

export const MAX_RETRIES = 2;
