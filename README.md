# OmniCode (Useg-kop)

Premium AI coding / agent Mini App (Telegram WebApp ready).

## Live

- **Asosiy UI:** https://xojasoipov-sketch.github.io/Useg-kop/
- **Legacy SPA:** https://xojasoipov-sketch.github.io/Useg-kop/legacy/

> Deploy: har `main` push da `.github/workflows/pages.yml` → `omnicode/frontend` ni `gh-pages` ga chiqaradi.

## Strukturа

| Yo‘l | Vazifa |
|------|--------|
| `omnicode/frontend/` | **Asosiy** frontend (GitHub Pages) |
| `omnicode/backend/` | Cloudflare Workers API (AI, GitHub, auth) |
| `omnicode/supabase/` | DB schema |
| `index.html` + `app.js` | Eski SPA (`/legacy/`) |
| `proxy.js` | Lokal AI proxy (ixtiyoriy) |

Batafsil: [STRUCTURE.md](./STRUCTURE.md)

## Lokal

Frontend statik — brauzerda `omnicode/frontend/index.html` oching yoki oddiy static server:

```bash
npx --yes serve omnicode/frontend -p 5173
```

Backend (Workers):

```bash
cd omnicode/backend && npm i && npx wrangler dev
```

## Roadmap

1. ✅ Deploy: omnicode = primary Pages
2. Auth (Telegram HMAC) + Supabase RLS
3. Server-side AI streaming
4. tma.js + chat UX
