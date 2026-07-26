#!/bin/bash
# ══════════════════════════════════════════════════
#  OmniRoute bepul provayderlar — avtomatik sozlash
# ══════════════════════════════════════════════════
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}⚡ OmniRoute — Bepul Provayderlar Sozlanmoqda...${NC}\n"

# .env fayl yaratish
if [ ! -f .env ]; then
  cp .env.example .env
  echo -e "${YELLOW}📝 .env fayl yaratildi. Keylarni kiriting:${NC}"
  echo ""
fi

# Keylarni so'rash
ask_key() {
  local name=$1
  local var=$2
  local url=$3
  local current=$(grep "^${var}=" .env | cut -d'=' -f2)

  if [ -z "$current" ] || [ "$current" = "..." ] || [[ "$current" == *"..." ]]; then
    echo -e "${YELLOW}${name}${NC} (${url})"
    read -p "  API key kiriting (Enter — o'tkazib yuborish): " key
    if [ -n "$key" ]; then
      sed -i "s|^${var}=.*|${var}=${key}|" .env
      echo -e "  ${GREEN}✓ Saqlandi${NC}"
    else
      echo -e "  ⏭  O'tkazildi"
    fi
    echo ""
  else
    echo -e "  ${GREEN}✓ ${name} — allaqachon sozlangan${NC}"
  fi
}

echo -e "${BLUE}Quyidagi bepul saytlarga ro'yxatdan o'ting va keylarni kiriting:${NC}\n"

ask_key "1. GROQ (eng tez, bepul)"        "GROQ_API_KEY"        "groq.com/keys"
ask_key "2. GEMINI (kuchli, bepul)"        "GEMINI_API_KEY"      "aistudio.google.com"
ask_key "3. CEREBRAS (1M token/kun)"       "CEREBRAS_API_KEY"    "inference.cerebras.ai"
ask_key "4. DEEPSEEK (bepul tier)"         "DEEPSEEK_API_KEY"    "platform.deepseek.com"
ask_key "5. NVIDIA NIM (40 rpm bepul)"     "NVIDIA_API_KEY"      "build.nvidia.com"
ask_key "6. TOGETHER AI (\$25 kredit)"     "TOGETHER_API_KEY"    "api.together.xyz"
ask_key "7. HUGGING FACE (bepul)"          "HUGGINGFACE_API_KEY" "huggingface.co/settings/tokens"
ask_key "8. MISTRAL (bepul tier)"          "MISTRAL_API_KEY"     "console.mistral.ai"

echo -e "\n${BLUE}🚀 OmniRoute ishga tushirilmoqda...${NC}"
docker compose up -d

echo ""
echo -e "${GREEN}✅ Tayyor! OmniRoute ishlayapti:${NC}"
echo -e "   ${BLUE}http://localhost:3000${NC} — API endpoint"
echo -e "   ${BLUE}http://localhost:3000/health${NC} — holat"
echo -e "   ${BLUE}http://localhost:3000/providers${NC} — faol provayderlar"
echo ""
echo -e "${YELLOW}Claude Code bilan ishlatish:${NC}"
echo -e "   ${GREEN}claude config set apiBaseUrl http://localhost:3000/v1${NC}"
echo -e "   ${GREEN}claude config set apiKey omniroute${NC}"
echo ""
echo -e "${YELLOW}Pollinations (key shart emas) to'g'ridan-to'g'ri:${NC}"
echo -e "   ${GREEN}claude config set apiBaseUrl https://text.pollinations.ai/openai${NC}"
