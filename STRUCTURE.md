# OmniRoute / OmniCode — Loyiha Tuzilishi

```
Useg-kop/
│
├── app.html              # 📱 OmniCode — Telefon AI coding assistant (brauzerda ishlaydi)
│                         #    - Chat (OpenRouter + Groq + Pollinations)
│                         #    - Skills (12 ta: Python, HTML, React, Bot...)
│                         #    - Fayl yaratish va tahrirlash
│                         #    - GitHub push (API orqali)
│                         #    - Connectors: OpenRouter 4 key, Groq, GitHub
│
├── index.html            # 🌐 OmniRoute landing page
│                         #    - 251 ta provayder haqida ma'lumot
│                         #    - Bepul tier jadval
│                         #    - CLAUDE.md, Sub-agents, Agent Team bo'limlari
│
├── proxy.js              # ⚡ OmniRoute proxy server (Node.js)
│                         #    - OpenAI-compatible API (/v1/chat/completions)
│                         #    - 4 OpenRouter key rotatsiyasi
│                         #    - Groq fallback
│                         #    - Pollinations fallback (key shart emas)
│                         #    - /health, /v1/models endpointlar
│
├── start.sh              # 🚀 Bir buyruq bilan ishga tushirish
│                         #    proxy.js ni background'da ishga tushiradi
│                         #    Claude Code ni avtomatik sozlaydi
│
├── setup.sh              # 🔧 Interaktiv sozlash skripti
│                         #    API keylarni so'raydi, .env ga yozadi
│
├── package.json          # 📦 Node.js konfiguratsiyasi
│                         #    {"type": "module", "scripts": {"start": "node proxy.js"}}
│
├── docker-compose.yml    # 🐳 Docker konfiguratsiyasi (ixtiyoriy)
│
├── .env                  # 🔑 Real API keylar (gitignore'd, local only!)
│                         #    OPENROUTER_KEY_1..4
│                         #    GROQ_API_KEY
│
├── .env.example          # 📋 .env shablon (placeholder keylar)
│
├── .gitignore            # 🚫 .env va node_modules ni git dan chiqaradi
│
├── CLAUDE.md             # 📖 Claude Code uchun loyiha qo'llanmasi
│                         #    Bepul provayderlar ro'yxati
│                         #    Sozlash buyruqlari
│                         #    Sub-agents va Agent Team haqida
│
└── .claude/
    └── agents/
        ├── researcher.md # 🔍 Researcher agent — o'rganadi, savollarga javob beradi
        ├── coder.md      # 💻 Coder agent — kod yozadi va o'zgartiradi
        └── reviewer.md   # ✅ Reviewer agent — kod sifatini tekshiradi
```

---

## Qanday ishlaydi

### 1. Telefonda (app.html)
```
Brauzer → app.html → OpenRouter API → Llama 3.3 70B (bepul)
                   → Groq API       → Llama 3.3 (bepul)
                   → Pollinations   → (key ham shart emas)
```

### 2. Lokal server (proxy.js)
```
Claude Code → localhost:3000 → OpenRouter → (limit tugasa) → Groq → Pollinations
```

### 3. Agent Team
```
Bosh agent (Claude) → parallel:
                      ├── researcher.md  (kodni o'rganadi)
                      ├── coder.md       (kod yozadi)
                      └── reviewer.md    (tekshiradi)
                    → natija
```

---

## Tezkor boshlash

### Telefonda (hoziroq):
1. GitHub → `app.html` → Raw → Brauzerda ochin
2. 🔌 Sozlash → OpenRouter keylarni kiriting
3. Chat qiling!

### Lokal server (kompyuter/Termux kerak):
```bash
git clone https://github.com/xojasoipov-sketch/Useg-kop
cd Useg-kop
cp .env.example .env   # keylarni to'ldiring
bash start.sh          # ishga tushirish
```

---

## Texnologiyalar

| Fayl | Texnologiya |
|------|-------------|
| app.html | Vanilla HTML/CSS/JS (framework yo'q) |
| proxy.js | Node.js (ESM modules, built-in http/https) |
| start.sh | Bash |
| .claude/agents/ | Markdown (Claude Code sub-agents) |

---

## GitHub

**Repo:** `xojasoipov-sketch/Useg-kop`  
**Branch:** `claude/shuni-chuntr-va-qil-60bfra`
