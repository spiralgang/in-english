#!/data/data/com.termux/files/usr/bin/bash
set -e

RST='\033[0m'
GRN='\033[0;32m'
YLW='\033[0;33m'
RED='\033[0;31m'
DIM='\033[2m'
BLD='\033[1m'
CYN='\033[0;36m'

clear

echo ""
echo -e "${CYN}  ╭─────────────────────────────────╮${RST}"
echo -e "${CYN}  │     SI BABU — AI Agent          │${RST}"
echo -e "${CYN}  │     Installer v1.0              │${RST}"
echo -e "${CYN}  ╰─────────────────────────────────╯${RST}"
echo ""
echo -e "${DIM}  AI Agent dengan Multi-Crew System${RST}"
echo -e "${DIM}  Jalan di Termux + Node.js${RST}"
echo ""

# Cek Termux
if [ ! -d "/data/data/com.termux" ]; then
  echo -e "${RED}  ✕ Ini harus dijalankan di dalam Termux.${RST}"
  echo -e "${DIM}  Install Termux dari F-Droid: f-droid.org/en/packages/com.termux/${RST}"
  exit 1
fi

echo -e "${GRN}[1/4]${RST} Update packages..."
pkg update -y -q 2>/dev/null || true
echo -e "      ${GRN}✓${RST}"

echo -e "${GRN}[2/4]${RST} Install dependencies..."
pkg install -y -q nodejs git sqlite curl 2>/dev/null || {
  echo -e "${RED}  ✕ Gagal install dependencies.${RST}"
  echo -e "${DIM}  Coba manual: pkg install nodejs git sqlite curl${RST}"
  exit 1
}
echo -e "      ${GRN}✓${RST} node $(node --version)"
echo -e "      ${GRN}✓${RST} sqlite $(sqlite3 --version 2>&1 | head -1)"
echo -e "      ${GRN}✓${RST} git $(git --version 2>&1 | head -1)"

echo -e "${GRN}[3/4]${RST} Install Node.js packages..."
cd "$HOME/project" 2>/dev/null || cd "$(dirname "$0")"
npm install --no-audit --no-fund 2>/dev/null || {
  echo -e "${RED}  ✕ npm install gagal.${RST}"
  echo -e "${DIM}  Coba: cd ~/project && npm install${RST}"
  exit 1
}
echo -e "      ${GRN}✓${RST}"

echo -e "${GRN}[4/4]${RST} Setup environment..."
if [ ! -f ".env" ]; then
  cp .env.example .env 2>/dev/null || {
    cat > .env << 'ENVEOF'
AI_PROVIDER=nvidia
NVIDIA_API_KEY=YOUR_API_KEY_HERE
GEMINI_API_KEY=YOUR_API_KEY_HERE
TELEGRAM_BOT_TOKEN=YOUR_TOKEN_HERE
ENVEOF
  }
  echo -e "      ${YLW}⚠${RST} File .env dibuat. Silakan isi API key lo."
  echo -e "      ${DIM}  Edit: nano .env${RST}"
else
  echo -e "      ${GRN}✓${RST} .env sudah ada"
fi

# Bikin folder memory kalo belum ada
mkdir -p memory logs
touch memory/.gitkeep logs/.gitkeep

echo ""
echo -e "  ${BLD}Installasi selesai!${RST}"
echo ""
echo -e "  ${CYN}Cara pakai:${RST}"
echo -e "  ${YLW}npm start${RST}          — Ngobrol personal"
echo -e "  ${YLW}npm run crew${RST}       — Mode tim (multi-agent)"
echo -e "  ${YLW}npm run crew:start${RST} — Daemon background"
echo ""
echo -e "  ${DIM}Edit .env dulu buat isi API key:${RST}"
echo -e "  ${DIM}  nano .env${RST}"
echo -e "  ${DIM}  • NVIDIA: gratis di integrate.api.nvidia.com${RST}"
echo -e "  ${DIM}  • Gemini: gratis di aistudio.google.com${RST}"
echo ""
