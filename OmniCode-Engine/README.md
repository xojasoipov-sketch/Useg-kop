# OmniCode-Engine

AI dasturlash agenti uchun universal loyihalarni boshqarish va ishlatish platformasi.

## Strukturasi

```
OmniCode-Engine/
├── agents/                  # AI agentlar uchun asosiy kodlar
│   ├── omni-agent/          # Asosiy OmniCode AI agenti
│   ├── code-analyzer/       # Kodlarni tahlil qilish uchun modullar
│   ├── github-manager/      # GitHub bilan ishlash uchun modullar
│   └── supabase-manager/    # Supabase bilan ishlash uchun modullar
├── projects/                # Barcha loyihalarni saqlash uchun papkalar
│   ├── Useg-kop/            # Ushbu repo
│   ├── ipost-smm-ai/        # SMM AI loyihasi
│   ├── Emergent/            # Emergent loyihasi
│   ├── sadiprimetizim-crm/  # CRM loyihasi
│   └── Bolt-sadiprimetizim-crm/ # Bolt CRM loyihasi
├── config/                  # Konfiguratsiya fayllari
├── scripts/                 # Yordamchi skriptlar
├── docs/                    # Hujjatlar
└── .github/workflows/       # GitHub Actions uchun workflowlar
```

## Qurilishi

```bash
npm install
```

## Ishga tushirish

```bash
node agents/omni-agent/index.js
```

## Yangilanishlar

- AI agentlarni avtomatik yangilash
- Loyihalarni avtomatik klonlash va boshqarish
- GitHub bilan ishlash uchun integratsiya
- Supabase bilan ishlash uchun integratsiya