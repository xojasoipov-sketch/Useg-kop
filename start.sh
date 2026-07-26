#!/bin/bash
# OmniRoute — bir buyruq bilan ishga tushirish
set -e

echo "⚡ OmniRoute ishga tushirilmoqda..."

# Eski proxy'ni to'xtatish
pkill -f "node proxy.js" 2>/dev/null || true
sleep 1

# Background'da ishga tushirish
nohup node proxy.js > proxy.log 2>&1 &
sleep 2

if curl -s http://localhost:3000/health > /dev/null 2>&1; then
  echo "✅ Proxy ishlayapti!"
  curl -s http://localhost:3000/health | node -e \
    "const d=require('fs').readFileSync('/dev/stdin','utf8');
     const r=JSON.parse(d);
     console.log('Provayderlar: '+r.providers.join(', '));
     console.log('OpenRouter keylar: '+r.openrouter_keys+' ta');"

  echo ""
  echo "Claude Code ulash:"
  claude config set apiBaseUrl http://localhost:3000/v1
  claude config set apiKey omniroute
  echo "✅ Ulandi! Endi Claude Code bepul ishlaydi."
else
  echo "❌ Xatolik. proxy.log ni tekshiring:"
  cat proxy.log
fi
