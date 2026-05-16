#!/bin/bash
echo "🧹 Membersihkan data sensitif sebelum upload GitHub..."

# Hapus memory files
rm -f memory/*.json memory/*.db memory/*.jsonl 2>/dev/null
touch memory/.gitkeep

# Hapus logs
rm -rf logs/* 2>/dev/null
touch logs/.gitkeep

# Hapus .env (user bikin sendiri)
rm -f .env

# Hapus backup files
rm -f *.bak *.backup *~

# Hapus generated skills
rm -f skills/evolved_* 2>/dev/null

echo "✅ Bersih! Siap upload ke GitHub."
echo "⚠️  User nanti tinggal: cp .env.example .env && bash install.sh"
