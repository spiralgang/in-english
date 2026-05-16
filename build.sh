#!/bin/bash
echo "📦 Compiling SI BABU ke single binary..."

# Cek dependencies
command -v node >/dev/null 2>&1 || { echo "Node.js required!"; exit 1; }

# Install pkg globally
npm install -g pkg 2>/dev/null || npm install --save-dev pkg

# Compile
npx pkg . --targets node18-linux-arm64 --output bin/sibabu

if [ -f bin/sibabu ]; then
    chmod +x bin/sibabu
    echo "✅ Single binary created: bin/sibabu"
    echo "   Size: $(du -h bin/sibabu | cut -f1)"
    echo "   Run: ./bin/sibabu"
else
    echo "❌ Compilation failed"
fi
