#!/bin/bash

echo "🚀 OmniRoute LOCAL SETUP"
echo "======================="
echo ""

# 1. Root dependencies
echo "📦 Step 1: Root npm install..."
npm install --legacy-peer-deps 2>/dev/null || npm install

# 2. Frontend dependencies
echo "🎨 Step 2: Frontend npm install..."
cd omnicode/frontend
npm install --legacy-peer-deps 2>/dev/null || npm install
npm run build
cd ../..

# 3. Backend build
echo "🔧 Step 3: Proxy setup..."
chmod +x proxy.js

echo ""
echo "✅ SETUP TUGADI!"
echo ""
echo "🎯 Ishga tushirish (2 TERMINAL):"
echo ""
echo "Terminal 1 — BACKEND:"
echo "  node proxy.js"
echo ""
echo "Terminal 2 — FRONTEND:"
echo "  cd omnicode/frontend && npm run dev"
echo ""
echo "🌐 URLs:"
echo "  Backend: http://localhost:3000"
echo "  Frontend: http://localhost:5173"
echo ""
