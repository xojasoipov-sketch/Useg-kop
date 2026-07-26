#!/bin/bash
# ══════════════════════════════════════════════
#  OmniRoute — ishga tushirish va Claude ulash
# ══════════════════════════════════════════════
set -e

# .env yo'q bo'lsa yaratish
if [ ! -f .env ]; then
  cp .env.example .env
  echo "⚠️  .env fayl yaratildi. Ixtiyoriy: keylarni kiriting"
fi

# Eski proxy'ni to'xtatish
pkill -f "node proxy.js" 2>/dev/null || true
sleep 1

# Proxy'ni background'da ishga tushirish
echo "🚀 OmniRoute proxy ishga tushirilmoqda..."
node proxy.js &
PROXY_PID=$!
sleep 2

# Tekshirish
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
  echo "✅ Proxy ishlayapti (PID: $PROXY_PID)"
  echo ""
  echo "🔗 Claude Code ulash:"
  claude config set apiBaseUrl http://localhost:3000/v1
  claude config set apiKey omniroute
  echo "✅ Claude Code ulandi!"
  echo ""
  echo "Barcha provayderlar:"
  curl -s http://localhost:3000/health | node -e \
    "const d=require('fs').readFileSync('/dev/stdin','utf8');
     const r=JSON.parse(d);
     r.providers.forEach((p,i)=>console.log('  '+(i+1)+'. '+p.name+' — '+p.model))"
  echo ""
  echo "To'xtatish: pkill -f 'node proxy.js'"
else
  echo "❌ Proxy ishga tushmadi"
  kill $PROXY_PID 2>/dev/null
  exit 1
fi
