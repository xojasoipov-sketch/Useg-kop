# OmniCode / Useg-kop — Loyiha tuzilishi

**Asosiy mahsulot:** `omnicode/frontend`  
**Live (GitHub Pages):** https://xojasoipov-sketch.github.io/Useg-kop/  
**Legacy SPA:** `/legacy/` (eski ildiz `index.html` + `app.js`)

```
Useg-kop/
│
├── omnicode/
│   ├── frontend/           # ✅ ASOSIY Mini App UI (Pages ga shu deploy qilinadi)
│   │   ├── index.html
│   │   ├── app.js, features.js, premium.js, …
│   │   ├── styles/main.css
│   │   └── …
│   ├── backend/            # Cloudflare Workers (Hono) — AI, GitHub, auth
│   ├── supabase/           # schema.sql
│   └── .github/workflows/  # CF deploy (alohida secrets kerak)
│
├── index.html              # Legacy telefon SPA (Pages: /legacy/)
├── app.js, style.css, agents.js
├── favicon.svg
├── proxy.js                # Lokal OpenAI-compatible proxy (optional)
├── .github/workflows/
│   └── pages.yml           # gh-pages: omnicode/frontend → root, legacy → /legacy/
│
├── .claude/agents/         # Claude Code sub-agents
├── CLAUDE.md
└── STRUCTURE.md            # Shu fayl
```

## Deploy

### GitHub Pages (asosiy)
- Trigger: `main` ga push yoki workflow_dispatch
- Chiqish: `gh-pages` branch
- Primary: `omnicode/frontend/*` → sayt ildizi
- Backup: ildizdagi eski UI → `/legacy/`

### Cloudflare (ixtiyoriy)
- `omnicode/.github/workflows/deploy.yml`
- Secrets: `CLOUDFLARE_API_TOKEN`, API keylar, `BOT_TOKEN`, `JWT_SECRET`, …

## Tezkor ochish
1. https://xojasoipov-sketch.github.io/Useg-kop/  (Actions tugagach)
2. Cache: `?v=` qo‘shing yoki inkognito
3. Eski UI: https://xojasoipov-sketch.github.io/Useg-kop/legacy/

## Keyingi qadamlar (tahlil bo‘yicha)
1. ~~Deploy tozalash~~ ✅
2. Auth HMAC + Supabase RLS
3. Backend AI streaming (kalitlar serverda)
4. tma.js + premium chat UI
