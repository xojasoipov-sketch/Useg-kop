/**
 * OmniBrain — Planner
 * single | multi | agent_team (faqat self_*)
 */

import { isSelfIntent } from './intent.js';

/**
 * @param {{ intent: string, text: string }} input
 * @returns {{ type: 'single'|'multi'|'agent_team', steps: string[], useTeam: boolean }}
 */
export function plan(input) {
  const { intent, text } = input;
  const useTeam = isSelfIntent(intent) && intent !== 'self_import';

  if (intent === 'command' || intent === 'settings' || intent === 'chat') {
    return { type: 'single', steps: ['Javob berish'], useTeam: false };
  }

  if (intent === 'self_rebuild') {
    return {
      type: 'agent_team',
      useTeam: true,
      steps: [
        'Identity va repo scope tekshirish',
        'GitHubdan daraxt va muhim fayllarni o\'qish',
        'Bo\'shliqlar va xatolarni tahlil qilish',
        'Qayta qurish rejasini tuzish',
        'O\'zgarishlarni yozish (diff tasdiq)',
        'Critic / xavfsizlik tekshiruvi',
        'Push + deploy (foydalanuvchi tasdiqi)',
      ],
    };
  }

  if (intent === 'self_heal' || intent === 'self_analyze') {
    return {
      type: 'agent_team',
      useTeam: true,
      steps: [
        'O\'z kodini o\'qish',
        'Muammolarni topish',
        'Tuzatish takliflari (diff)',
        'Tekshiruv',
      ],
    };
  }

  if (intent === 'self_import') {
    return {
      type: 'multi',
      useTeam: false,
      steps: [
        'Self-repo fayllarini ro\'yxatlash',
        'VFS / loyihaga import',
        'Natijani ko\'rsatish',
      ],
    };
  }

  if (['code', 'fix', 'refactor'].includes(intent)) {
    const multi = /bir necha|multi|butun|modul|loyiha|barcha/i.test(text || '');
    return {
      type: multi ? 'multi' : 'single',
      useTeam: false,
      steps: multi
        ? ['Scope aniqlash', 'Reja', 'Kod yozish', 'Diff tasdiq']
        : ['Kod yozish yoki tuzatish'],
    };
  }

  if (intent === 'deploy') {
    return {
      type: 'multi',
      useTeam: false,
      steps: ['GitHub holatini tekshirish', 'Fayllarni tayyorlash', 'Deploy (tasdiq)'],
    };
  }

  return { type: 'single', steps: ['Bajarish'], useTeam };
}

/** Agent team rollari (self_* uchun) */
export const TEAM_ROLES = {
  researcher: {
    id: 'researcher',
    label: 'Tadqiqotchi',
    systemExtra:
      'Faqat o\'qish va tahlil. Kod yozma. GH_LIST_* va GH_READ_FILE ishlat. Xulosa qisqa va aniq.',
  },
  coder: {
    id: 'coder',
    label: 'Dasturchi',
    systemExtra:
      'Tadqiqot xulosasiga asoslanib WRITE_FILE / GH_WRITE_FILE taklif qil. Secret yozma. Har fayl uchun aniq path.',
  },
  reviewer: {
    id: 'reviewer',
    label: 'Tekshiruvchi',
    systemExtra:
      'Diff xavfini bahola: secret, buzilish, scope. Approve yoki rad sabablari. Kod qayta yozma, faqat review.',
  },
};
