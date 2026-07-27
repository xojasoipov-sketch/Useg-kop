# OmniCode frontend boot

## Muhim (1 qator)

`index.html` oxiridagi script (classic — type="module" kerak emas):

```html
<script src="app.js?v=3.1"></script>
```

`app.js` classic: `Brain` ni `import('./brain/index.js')` orqali dynamic yuklaydi.
`type="module"` ham ishlaydi, lekin majburiy emas.

Hozirgi index: `app.js?v=20250726-10&bust=force` — ishlaydi; cache-bust uchun `v=3.1` tavsiya.

## Nima ulangan

| # | Vazifa | Holat |
|---|--------|--------|
| 1 | Store, AIRouter, Git, DiffView | `app.js` |
| 2 | `AI.send` → `Brain.handle` | ulangan |
| 3 | `SelfImprove.run` → `Brain.runSelf('self_rebuild')` | ulangan |
| 4 | Test | quyida |

## Test (4)

1. Sozlamalar → Kod → **GitHub PAT** (`repo` scope) saqlang.
2. (Ixtiyoriy) OpenRouter / Groq kalit.
3. AI Chat:
   - `/rebuild` yoki «O'zingni 0 dan qur»
   - yoki Bosh sahifa → **O'zini yaxshila**
4. Diff chiqsa → **Hammasi** / rad etish.
5. Console: `OmniCode app.js + Brain tayyor`

Branch: `claude/shuni-chuntr-va-qil-60bfra`
