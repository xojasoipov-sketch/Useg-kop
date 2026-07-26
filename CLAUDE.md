# OmniRoute / OmniCode — Claude Code Qo'llanmasi

## Loyiha haqida

**OmniRoute** — bir nechta bepul AI provayderlarini bitta OpenAI-kompatibel endpoint orqali boshqaruvchi Node.js proxy server. Limit tugasa, avtomatik keyingi provayderga o'tadi.

**OmniCode** (`app.html`) — brauzerda to'liq ishlaydigan mobil AI coding assistant. Framework yo'q — sof Vanilla HTML/CSS/JS.

**Repo:** `xojasoipov-sketch/Useg-kop`

---

## Fayl tuzilishi

```
Useg-kop/
├── proxy.js              # OmniRoute proxy server (Node.js ESM)
│                         # Endpointlar: /health, /v1/models, /v1/chat/completions
│                         # Provayder zanjiri: OpenRouter → Groq → Pollinations
│
├── app.html              # OmniCode mobil coding assistant
│                         # 4 panel: Chat, Skills, Files, Connectors
│                         # OpenRouter/Groq/Pollinations API bilan to'g'ridan ishlaydi
│
├── index.html            # OmniRoute landing page (GitHub Pages)
│
├── package.json          # {"type": "module"} — ESM, "start": "node proxy.js"
│
├── docker-compose.yml    # Docker orqali ishlatish (ixtiyoriy)
│                         # ghcr.io/diegosouzapw/omniroute:latest image
│
├── setup.sh              # Interaktiv sozlash: API keylarni so'rab .env ga yozadi
│                         # Oxirida `docker compose up -d` ishga tushiradi
│
├── start.sh              # Tezkor start: proxy.js background'da, claude config set
│
├── setup-bot.sh          # Bot sozlash skripti
│
├── STRUCTURE.md          # Loyiha tuzilishi tavsifi (vizual, o'zbek tilida)
│
├── omnicode/             # OmniCode frontend (GitHub Pages'ga deploy qilinadi)
│   └── frontend/         # .github/workflows/pages.yml orqali gh-pages branchga
│
├── .env                  # Real API keylar (gitignore'd — HECH QACHON commit qilma!)
├── .env.example          # Shablon (placeholder keylar)
│
└── .claude/
    └── agents/
        ├── coder.md      # Kod yozuvchi agent
        ├── researcher.md # Tadqiqotchi agent
        └── reviewer.md   # Tekshiruvchi agent
```

---

## proxy.js — Asosiy mantiq

**ESM modules** ishlatiladi (`import/export`, `"type": "module"` paketda).

### Provayder zanjiri (ustuvorlik tartibi)
1. **OpenRouter** — `OPENROUTER_KEY_1..4` bo'lsa, rotatsiya bilan ishlatadi. Model: `meta-llama/llama-3.3-70b-instruct:free`
2. **Groq** — `GROQ_API_KEY` bo'lsa. Model: `llama-3.3-70b-versatile`
3. **Pollinations** — har doim, key shart emas. Model: `openai`

### Model almashtirish qoidasi (`httpsRequest` ichida)
Model nomi `auto`, `claude-*`, yoki `gpt-*` bo'lsa — provayderning default modeli ishlatiladi. Boshqa nomlar o'zgartirilmaydi.

### HTTP endpointlar
- `GET /` yoki `/health` → status, faol provayderlar, key soni
- `GET /v1/models` → faol provayderlar ro'yxati
- `POST /v1/chat/completions` → OpenAI-kompatibel chat API
- `OPTIONS *` → CORS preflight (204)

### Xato holatlari
- `429` yoki `503` → limit, keyingi provayderga o'tadi
- `>= 400` → xato, keyingi provayderga o'tadi
- Barcha provayderlar ishlamasa → 500 qaytaradi

---

## Muhit o'zgaruvchilari (.env)

```env
OPENROUTER_KEY_1=sk-or-...    # OpenRouter (ixtiyoriy, 4 tagacha)
OPENROUTER_KEY_2=sk-or-...
OPENROUTER_KEY_3=sk-or-...
OPENROUTER_KEY_4=sk-or-...
GROQ_API_KEY=gsk_...           # Groq (ixtiyoriy)
CEREBRAS_API_KEY=...           # docker-compose orqali (ixtiyoriy)
GEMINI_API_KEY=...
DEEPSEEK_API_KEY=...
NVIDIA_API_KEY=...
TOGETHER_API_KEY=...
HUGGINGFACE_API_KEY=...
MISTRAL_API_KEY=...
PORT=3000                      # Default: 3000
```

`.env` — **gitignore'd**. Hech qachon commit qilma.

---

## Ishga tushirish

### Tezkor start (lokal)
```bash
bash start.sh
# proxy.js background'da, port 3000
```

### To'liq sozlash
```bash
cp .env.example .env
bash setup.sh          # API keylarni so'raydi, docker compose up -d ishlatadi
```

### Manual
```bash
node proxy.js          # foreground
node --watch proxy.js  # dev mode (hot reload)
```

### Docker
```bash
docker compose up -d
docker compose logs -f
```

---

## Claude Code bilan ulash

```bash
# OmniRoute orqali (barcha bepul provayderlar)
claude config set apiBaseUrl http://localhost:3000/v1
claude config set apiKey omniroute

# Yoki to'g'ridan-to'g'ri Pollinations (hech qanday server kerak emas)
claude config set apiBaseUrl https://text.pollinations.ai/openai
claude config set apiKey dummy
```

---

## Sub-agents (`.claude/agents/`)

| Agent | Tavsif | Tools |
|-------|--------|-------|
| `coder` | Kod yozadi, fayllar yaratadi va o'zgartiradi | Read, Write, Edit, Bash, Glob, Grep |
| `researcher` | Kodni o'rganadi, savollarga javob beradi. Kod yozmaydi | Read, Glob, Grep, WebSearch, WebFetch |
| `reviewer` | Kod sifatini tekshiradi, xatoliklarni topadi. Faqat o'qiydi | Read, Glob, Grep |

### Agent Team (parallel ishlatish)
Katta vazifalar uchun:
```
Bosh agent → parallel:
             ├── researcher (o'rganadi)
             ├── coder (yozadi)
             └── reviewer (tekshiradi)
           → yig'ilgan natija
```

---

## GitHub Actions (`.github/workflows/pages.yml`)

`main` branch yoki `claude/shuni-chuntr-va-qil-60bfra` branchga push bo'lganda:
- `omnicode/frontend/` papkasi `gh-pages` branchiga deploy qilinadi
- GitHub Pages orqali chiqariladi

---

## Konvensiyalar

- **Til:** Kod va skriptlar inglizcha, sharhlar o'zbek tilida
- **JS moduli:** ESM (`import/export`), CommonJS ishlatma
- **Xatolar:** har bir provayder xatosi log qilinadi, zanjir davom etadi
- **CORS:** barcha so'rovlarga `*` ruxsat berilgan
- **Timeout:** har bir provayderga 30 soniya
- **Log formati:** `[HH:MM:SS] → ProvayderNomi` va `✓`/`✗`

## Bepul Provayderlar (tashqi)

| Provayder | URL | Limit |
|-----------|-----|-------|
| Pollinations | text.pollinations.ai | Key shart emas |
| Groq | groq.com/keys | Tez, bepul tier |
| Cerebras | inference.cerebras.ai | 1M token/kun |
| Gemini | aistudio.google.com | Bepul tier |
| DeepSeek | platform.deepseek.com | Bepul tier |
| NVIDIA NIM | build.nvidia.com | 40 RPM bepul |
| Together AI | api.together.xyz | $25 bepul kredit |
| HuggingFace | huggingface.co/settings/tokens | Bepul |
| Mistral | console.mistral.ai | Bepul tier |
| OpenRouter | openrouter.ai | Bepul modeller |
