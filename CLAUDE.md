# OmniRoute — Claude Code Qo'llanmasi

## Loyiha haqida
251 ta AI provayderini bitta endpoint orqali boshqaruvchi router.
Bepul tier — limit tugasa avtomatik keyingisiga o'tadi.

## Bepul Provayderlar (Ustuvorlik tartibi)
1. **Pollinations** — key shart emas, hoziroq ishlaydi
2. **Groq** — eng tez, `groq.com/keys` dan bepul key
3. **Cerebras** — 1M token/kun, `inference.cerebras.ai`
4. **Gemini** — `aistudio.google.com` dan bepul key
5. **DeepSeek** — `platform.deepseek.com`
6. **NVIDIA NIM** — `build.nvidia.com`
7. **Together AI** — $25 bepul kredit
8. **HuggingFace** — `huggingface.co/settings/tokens`
9. **Mistral** — `console.mistral.ai`

## Sozlash
```bash
cp .env.example .env   # keylarni to'ldiring
bash setup.sh          # avtomatik sozlash
```

## Claude Code bilan ishlatish
```bash
# OmniRoute orqali (barcha bepul provayderlar)
claude config set apiBaseUrl http://localhost:3000/v1
claude config set apiKey omniroute

# Yoki to'g'ridan-to'g'ri Pollinations (key yo'q)
claude config set apiBaseUrl https://text.pollinations.ai/openai
claude config set apiKey dummy
```

## Sub-agents
`.claude/agents/` papkasidagi agentlar har xil vazifalar uchun:
- `researcher.md` — kodni o'rganadi, savollarga javob beradi
- `coder.md` — kod yozadi va o'zgartiradi
- `reviewer.md` — kod sifatini tekshiradi

## Agent Team
Katta vazifalar uchun agentlar parallel ishlaydi:
```
Bosh agent → [researcher + coder + reviewer] parallel → natija
```
