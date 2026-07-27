# OmniBrain v1

OmniCode ning **miya** moduli — intent, kontekst, reja, tool protocol, critic, self-bootstrap.

## Fayllar

| Fayl | Vazifa |
|------|--------|
| `index.js` | Master orchestrator — `createBrain(deps).handle(msg)` |
| `identity.js` | Self-repo, branch, write scope |
| `intent.js` | Intent classifier (slash + keyword) |
| `context.js` | Context builder + token budget |
| `planner.js` | single / multi / agent_team |
| `tools.js` | GH_* / WRITE_FILE parse + execute |
| `safety.js` | Secret mask, path audit, HTML escape |
| `critic.js` | Self-review, retry signal |
| `self.js` | Self-import / heal / rebuild pipeline + minimal team |

## Ulanish

```js
import { createBrain } from './brain/index.js';

const Brain = createBrain({
  AIRouter,   // { chat(messages) }
  Git,        // listFiles, getFileContent, pushFile...
  FS, PM, DiffView, Deploy, SelfImport, SelfHeal, Store, SB,
  getMessages: () => chatHistory,
  onMessage: (m) => appendBubble(m),
  onStatus: (s) => setStatus(s),
  clearChat: () => { chatHistory = []; },
});

// Chat yuborish
await Brain.handle(userText);

// Self rebuild
await Brain.runSelf('self_rebuild', 'O\'zingni 0 dan qur');
```

## Self-bootstrap

```
/self | /rebuild | "o'zini qur"
  → FETCH tree
  → Researcher (read)
  → Coder (WRITE/GH_WRITE taklif)
  → Reviewer
  → DiffView tasdiq (majburiy)
  → (foydalanuvchi) push / deploy
```

**Hech qachon** yozuv yashirin emas. `.env` / secret path bloklangan.

## Xavfsizlik

- Write faqat `IDENTITY.allowedWritePrefixes`
- Faqat `xojasoipov-sketch/Useg-kop`
- Secret pattern → mask + write block
- Max 3 tool / turn, max 2 critic retry

## Keyingi qadamlar

1. Haqiqiy `app.js` da `AIRouter` / `Git` / `DiffView` ni implement qilish
2. `Brain.handle` ni `AI.send` o‘rniga ulash
3. `SelfImprove.run` → `Brain.runSelf('self_rebuild')`
4. Test: token yo‘q / token bor / yozuv tasdiq / taqiqlangan path
