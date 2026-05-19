<div align="center">

**SI BABU**
*Terminal Intelligence for Termux & Linux*

[![Node.js](https://img.shields.io/badge/Node.js-v16+-green.svg)](https://nodejs.org)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Termux%20%7C%20Linux-orange.svg)](https://termux.dev)
[![Telegram](https://img.shields.io/badge/Telegram-Community-2CA5E0?logo=telegram)](https://t.me/sibabukomunitas)

</div>

---

## Apa Itu SI BABU?

**SI BABU** adalah AI Agent modular berbasis Node.js yang dirancang khusus untuk berjalan di terminal, terutama di **Termux (Android)** dan berbagai distribusi Linux.

Project ini lahir dari eksplorasi pribadi tentang bagaimana AI Agent bisa bekerja secara lokal, ringan, dan tetap berguna sehari-hari. SI BABU bukan sekadar chatbot — ia adalah agent cerdas yang bisa berpikir mandiri, menggunakan berbagai tools, mengingat percakapan jangka panjang, melakukan riset real-time, menulis kode lengkap, menganalisis error, serta bekerja kolaboratif lewat sistem **Multi-Agent Crew**.

> Project ini masih dalam tahap **Beta**. Beberapa fitur mungkin belum sempurna atau masih dalam penyempurnaan. Dibuat sebagai proyek pribadi untuk eksplorasi dan pembelajaran — bukan produk komersial. Feedback dan kontribusi sangat diharapkan.

---

## Fitur

| Fitur | Deskripsi |
|-------|-----------|
| **Multi-Agent Crew** | Tim agent (PM, Architect, Builder, Researcher, QA) yang bisa berdiskusi, berdebat, dan berkolaborasi menghasilkan kode production-ready |
| **Natural Conversation** | Ngobrol santai pakai bahasa Indonesia sehari-hari (gue/lo), bukan robot kaku |
| **Long-term Memory** | Mengingat percakapan dan belajar dari interaksi sebelumnya via SQLite |
| **RAG** | Bisa membaca dan belajar dari dokumen PDF/TXT milik user |
| **Multi AI Provider** | NVIDIA NIM, Groq, Gemini, OpenRouter, OpenAI, Ollama dengan fallback otomatis |
| **Real-time Web Research** | Cari dan rangkum informasi terkini dari internet |
| **Code Generation & Debugging** | Generate kode lengkap, analisis error, dan perbaiki bug secara otomatis |
| **Emotion Engine** | Mood si babu berubah sesuai konteks percakapan |
| **Telegram Gateway** | Akses SI BABU lewat bot Telegram |
| **WhatsApp Gateway** | Akses SI BABU lewat WhatsApp |
| **Setup Wizard** | Konfigurasi mudah dan ramah pemula lewat node setup.js |
| **Plugin System** | Mudah dikembangkan dengan menambahkan plugin baru |

---

## Persyaratan

Sebelum install, pastikan ini sudah ada:

- Node.js v16+
- Git
- sqlite3

Install di Termux:

    pkg update && pkg upgrade
    pkg install git nodejs sqlite

---

## Instalasi

    git clone https://github.com/monggosu/si-babu.git
    cd si-babu
    node setup.js

Setup wizard akan otomatis memandu kamu untuk:
- Install semua dependencies
- Memasukkan nama kamu dan nama agent
- Memilih provider AI dan mengisi API key
- Menguji koneksi ke provider yang dipilih
- Memilih model untuk setiap agent crew
- Mengaktifkan Telegram/WhatsApp gateway (opsional)

---

## Cara Menjalankan

    npm start          # Mode chat biasa
    npm run crew       # Mode multi-agent crew
    node setup.js      # Jalankan ulang wizard setup

---

## Contoh Penggunaan

Setelah npm start:

    halo                                       # sapaan biasa
    siapa kamu?                                # kenalan sama si babu
    browsing harga emas hari ini               # cari info realtime
    buatkan script backup folder otomatis      # generate kode lengkap
    fix: TypeError cannot read property        # debug dan fix error
    pelajari dokumen.pdf                       # belajar dari dokumen
    hitung 15% dari 850000                     # kalkulator

Untuk mode crew:

    npm run crew
    Masukkan task: buat REST API dengan Express

---

## Setup .env Manual

    cp .env.example .env
    nano .env

Contoh isi .env:

    AI_PROVIDER=groq

    GROQ_API_KEY=gsk_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
    NVIDIA_API_KEY=nvapi-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
    GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXX
    OPENROUTER_API_KEY=sk-or-XXXXXXXXXXXXXXXXXXXXXXXXXX
    OPENAI_API_KEY=sk-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

    OLLAMA_HOST=localhost
    OLLAMA_PORT=11434
    OLLAMA_MODEL=llama3.2

    CREW_MODEL_PM=meta/llama-3.3-70b-instruct
    CREW_MODEL_ARCHITECT=meta/llama-3.3-70b-instruct
    CREW_MODEL_BUILDER=meta/llama-3.3-70b-instruct
    CREW_MODEL_QA=meta/llama-3.3-70b-instruct
    CREW_MODEL_RESEARCHER=meta/llama-3.3-70b-instruct

    AGENT_NAME=si babu
    DEBUG=false

    TELEGRAM_GATEWAY=false
    TELEGRAM_BOT_TOKEN=

    WA_GATEWAY=false
    WA_MODE=wwebjs

JANGAN pernah upload file .env asli kamu ke GitHub!

---

## Provider AI yang Didukung

| Provider | Gratis | Kecepatan | Cara Daftar |
|----------|--------|-----------|-------------|
| Groq | Ya | Sangat Cepat | console.groq.com |
| NVIDIA NIM | Ya | Sedang | build.nvidia.com |
| OpenRouter | Ada free tier | Sedang | openrouter.ai |
| Google Gemini | Ada free tier | Cepat | aistudio.google.com |
| OpenAI | Berbayar | Cepat | platform.openai.com |
| Ollama | Gratis lokal | Tergantung HP | ollama.ai |

---

## Troubleshooting

**sqlite3 not found**

    pkg install sqlite

**NVIDIA response kosong atau timeout**

    AI_PROVIDER=groq

**Cannot find module**

    npm install

**Crew mode timeout**

    CREW_MODEL_BUILDER=llama-3.1-8b-instant

**WhatsApp Gateway tidak connect**

    pkg install chromium

---

## Struktur Project

    si-babu/
    ├── agent/
    │   ├── roles/          # chatter, builder, researcher, dll
    │   ├── crew/           # PM, Architect, Builder, QA, Researcher
    │   └── pipeline/       # alur per intent
    ├── core/               # memory, emotion engine, self-awareness
    ├── gateway/            # Telegram & WhatsApp
    ├── provider/           # NVIDIA, Groq, Gemini, dll
    ├── tools/              # web search, file, RAG, plugins
    ├── utils/              # helper functions
    ├── main.js             # entry point chat biasa
    ├── orchestrator.js     # otak utama SI BABU
    └── setup.js            # wizard setup

---

## Cara Modifikasi

Tambah provider baru — buat provider/namaprovider.js dengan export call() dan stream(). Lihat provider/groq.js sebagai contoh.

Tambah role agent baru — buat agent/roles/namarole.js dengan export run(ctx). Tambahkan ke pipeline di agent/pipeline/.

Tambah plugin baru — buat file di tools/plugins/namatool.js, auto-loaded tanpa perlu edit file lain.

---

## Kontribusi

1. Fork repo ini
2. Buat branch: git checkout -b fitur-baru
3. Commit: git commit -m tambah fitur X
4. Push: git push origin fitur-baru
5. Buat Pull Request

---

## Catatan Penting

- Project ini masih Beta dan terus berkembang
- Beberapa fitur bersifat eksperimental
- Crew mode bergantung pada kecepatan provider AI
- Dibuat sebagai proyek pribadi untuk eksplorasi dan pembelajaran
- Bukan produk komersial

---

## English

### What is SI BABU?

SI BABU is a modular AI Agent built with Node.js, designed to run in the terminal, especially on Termux (Android) and Linux.

Built from scratch as a personal exploration project, SI BABU goes beyond a simple chatbot. It can reason independently, use tools, retain long-term memory, research the web, generate complete code, debug errors, and collaborate through a Multi-Agent Crew system.

> Still in Beta. Some features are experimental. Built for personal learning — not a commercial product. Feedback welcome.

### Features

| Feature | Description |
|---------|-------------|
| Multi-Agent Crew | PM, Architect, Builder, Researcher, QA agents that discuss and collaborate |
| Natural Conversation | Casual Indonesian conversation style |
| Long-term Memory | Remembers conversations via SQLite |
| RAG | Learns from user PDF/TXT documents |
| Multi AI Provider | NVIDIA, Groq, Gemini, OpenRouter, OpenAI, Ollama with smart fallback |
| Web Research | Real-time information search |
| Code Generation | Generate complete scripts and debug errors |
| Emotion Engine | Mood adapts to conversation context |
| Telegram Gateway | Access via Telegram bot |
| WhatsApp Gateway | Access via WhatsApp |
| Setup Wizard | Beginner-friendly setup |
| Plugin System | Easily extensible |

### Installation

    git clone https://github.com/monggosu/si-babu.git
    cd si-babu
    node setup.js

### Usage

    npm start          # Normal chat mode
    npm run crew       # Multi-agent crew mode
    node setup.js      # Re-run setup wizard

### Important Notes

- Still in Beta, some features are experimental
- Built for personal exploration and learning
- Not a commercial product
- Crew mode depends on provider speed

---

<div align="center">

### Join the Community

[![Telegram Community](https://img.shields.io/badge/Telegram-Join%20SI%20BABU%20Community-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white)](https://t.me/sibabukomunitas)

---

[![GitHub](https://img.shields.io/badge/GitHub-monggosu%2Fsi--babu-181717?style=flat-square&logo=github)](https://github.com/monggosu/si-babu)
[![Built with Termux](https://img.shields.io/badge/Built%20with-Termux-black?style=flat-square&logo=android)](https://termux.dev)
[![Made in Indonesia](https://img.shields.io/badge/Made%20in-Indonesia-red?style=flat-square)](https://github.com/monggosu)

*Dibuat dengan hati di Indonesia*

</div>

---

## 📋 Changelog

### v0.9.0 — Termux:API & Tool Calling (Mei 2026)

**Fitur Baru:**
- Integrasi Termux:API — baca SMS, kirim notifikasi, ambil foto (depan/belakang), TTS, cek lokasi GPS, baterai, clipboard
- Tool Caller berbasis LLM — SI BABU mutusin sendiri kapan pakai tool, tanpa pattern matching kaku
- Foto kamera bisa langsung dikirim ke Telegram
- Crew mode: task simpel langsung 1 subtask tanpa over-breakdown
- Builder sekarang nyimpen hasil build ke folder `output/` biar tidak campur sama kode SI BABU
- Setup wizard support CLI flags: `--gateway`, `--provider`, `--identity`, `--models`, `--full`

**Bug Fix:**
- Output checker/verifier tidak bocor ke Telegram
- Self-awareness tidak lagi return dump teknis mentah
- Chatter null check — fallback ke LLM kalau tidak ada jawaban spesifik
- Classifier detect termux commands dengan benar

---

## 🗺️ Roadmap menuju v1.0

Project ini aktif dikembangkan menuju **v1.0 stable release**. Yang sedang dan akan dikerjakan:

- [ ] Stabilisasi semua fitur yang ada
- [ ] Self-improvement loop — SI BABU bisa edit kodenya sendiri
- [ ] Scheduled tasks — jalanin task otomatis terjadwal
- [ ] Voice input via Termux:API microphone
- [ ] Web UI (opsional)
- [ ] Dokumentasi lengkap per modul
- [ ] Test coverage

Kalau lo mau ikut kontribusi atau punya ide fitur, buka Issue atau Pull Request — semua masukan sangat diterima!


---

## 🔄 Update SI BABU

SI BABU punya fitur auto-update bawaan. Ada 2 cara update:

### Cara 1 — Update via Command (Recommended)
Langsung ketik di dalam SI BABU:

    update

SI BABU akan otomatis:
1. Cek apakah ada versi terbaru di GitHub
2. Download update terbaru
3. Install dependencies baru kalau ada
4. Kasih tau kalau update berhasil

Setelah update, restart SI BABU:

    exit
    npm start

### Cara 2 — Update Manual via Git

    cd si-babu
    git pull origin main
    npm install
    npm start

### Auto Notif Update
Setiap kali `npm start`, SI BABU otomatis cek update di background. Kalau ada versi baru, akan muncul notifikasi kuning di atas:

    ╔══════════════════════════════════════════════╗
    ║  🆕 UPDATE TERSEDIA!                         ║
    ╚══════════════════════════════════════════════╝
    Ketik "update" untuk update otomatis

> **Catatan:** Pastikan koneksi internet aktif saat update. Data dan konfigurasi (.env) tidak akan terhapus saat update.

