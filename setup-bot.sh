#!/bin/bash
# OmniCode Bot Setup
# Telegram botni sozlash va TMA ulash

BOT_TOKEN="${BOT_TOKEN:-$(grep BOT_TOKEN .env 2>/dev/null | cut -d= -f2-)}"
if [ -z "$BOT_TOKEN" ]; then
  echo "Error: BOT_TOKEN not set. Add it to .env or export BOT_TOKEN=..."
  exit 1
fi
BASE="https://api.telegram.org/bot${BOT_TOKEN}"

echo "=== OmniCode Bot Setup ==="
echo ""

# 1. Bot info
echo "📌 Bot ma'lumotlari:"
curl -s "${BASE}/getMe" | python3 -c "
import json,sys
d=json.load(sys.stdin)
if d.get('ok'):
    u=d['result']
    print(f'  Name: {u[\"first_name\"]}')
    print(f'  Username: @{u[\"username\"]}')
    print(f'  ID: {u[\"id\"]}')
else:
    print('  Error:', d)
"

echo ""

# 2. Bot commands o'rnatish
echo "⚡ Bot commandlarini o'rnatish..."
curl -s -X POST "${BASE}/setMyCommands" \
  -H "Content-Type: application/json" \
  -d '{
    "commands": [
      {"command": "start", "description": "OmniCode ni ishga tushirish"},
      {"command": "app", "description": "AI Coding dasturini ochish"},
      {"command": "help", "description": "Yordam"}
    ]
  }' | python3 -c "import json,sys; d=json.load(sys.stdin); print('  OK' if d.get('ok') else '  Error:', d)"

echo ""

# 3. Description o'rnatish
echo "📝 Bot tavsifini o'rnatish..."
curl -s -X POST "${BASE}/setMyDescription" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "🚀 OmniCode — World-class AI Coding Platform\n\n✅ 12 ta AI agent\n✅ GitHub integration\n✅ One-click deploy\n✅ Bepul provayderlar\n\n/app buyrug'\''ini bosing!"
  }' | python3 -c "import json,sys; d=json.load(sys.stdin); print('  OK' if d.get('ok') else '  Error:', d)"

echo ""

# 4. Short description
echo "📌 Qisqa tavsif..."
curl -s -X POST "${BASE}/setMyShortDescription" \
  -H "Content-Type: application/json" \
  -d '{"short_description": "AI Coding Platform — 12 agent, GitHub, Deploy"}' | python3 -c "import json,sys; d=json.load(sys.stdin); print('  OK' if d.get('ok') else '  Error:', d)"

echo ""

# 5. Menu button — TMA ni ochuvchi
echo "🎯 Menu tugmasini o'rnatish..."
# Bu yerga frontend URL kerak — Cloudflare Pages yoki GitHub Pages URL ni qo'ying
FRONTEND_URL="${1:-https://omnicode.pages.dev}"

curl -s -X POST "${BASE}/setChatMenuButton" \
  -H "Content-Type: application/json" \
  -d "{
    \"menu_button\": {
      \"type\": \"web_app\",
      \"text\": \"🚀 Open OmniCode\",
      \"web_app\": {\"url\": \"${FRONTEND_URL}\"}
    }
  }" | python3 -c "import json,sys; d=json.load(sys.stdin); print('  OK' if d.get('ok') else '  Error:', d)"

echo ""
echo "=== Setup tugadi! ==="
echo ""
echo "Botni Telegramda oching: https://t.me/$(curl -s "${BASE}/getMe" | python3 -c "import json,sys; print(json.load(sys.stdin)['result']['username'])")"
echo ""
echo "Frontend URL ni o'rnatish uchun:"
echo "  bash setup-bot.sh https://your-frontend-url.com"
