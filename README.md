<div align="center">

**SI BABU**
*Terminal Intelligence for Termux & Linux*

[![Node.js](https://img.shields.io/badge/Node.js-v16+-green.svg)](https://nodejs.org)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Termux%20%7C%20Linux-orange.svg)](https://termux.dev)
[![Telegram](https://img.shields.io/badge/Telegram-Community-2CA5E0?logo=telegram)](https://t.me/sibabukomunitas)

</div>

---

## What is SI BABU?

**SI BABU** is a modular AI Agent built with Node.js, designed specifically to run in the terminal, especially on **Termux (Android)** and various Linux distributions.

This project was born from a personal exploration into how AI Agents can work locally, remain lightweight, and still be useful in everyday tasks. SI BABU is more than just a chatbot — it's an intelligent agent that can reason independently, use tools, maintain long-term memory, research the web, and generate production-ready code.

> This project is still in **Beta**. Some features may not be perfect or are still being refined. Built as a personal project for exploration and learning — not a commercial product. Feedback is welcome.

---

## Features

| Feature | Description |
|---------|-------------|
| **Multi-Agent Crew** | A team of agents (PM, Architect, Builder, Researcher, QA) that can discuss, debate, and collaborate to produce production-ready code |
| **Natural Conversation** | Casual conversation in everyday language, not robotic responses |
| **Long-term Memory** | Remembers conversations and learns from previous interactions via SQLite |
| **RAG** | Can read and learn from user PDF/TXT documents |
| **Multi AI Provider** | NVIDIA NIM, Groq, Gemini, OpenRouter, OpenAI, Ollama with automatic fallback |
| **Real-time Web Research** | Search and summarize current information from the internet |
| **Code Generation & Debugging** | Generate complete code, analyze errors, and fix bugs automatically |
| **Emotion Engine** | SI BABU's mood changes based on conversation context |
| **Telegram Gateway** | Access SI BABU via Telegram bot |
| **WhatsApp Gateway** | Access SI BABU via WhatsApp |
| **Setup Wizard** | Easy and beginner-friendly configuration via node setup.js |
| **Plugin System** | Easy to extend by adding new plugins |

---

## Requirements

Before installing, make sure you have:

- Node.js v16+
- Git
- sqlite3

Install on Termux:

    pkg update && pkg upgrade
    pkg install git nodejs sqlite

---

## Installation

    git clone https://github.com/monggosu/si-babu.git
    cd si-babu
    node setup.js

The setup wizard will automatically guide you through:
- Installing all dependencies
- Entering your name and agent name
- Choosing an AI provider and entering your API key
- Testing the connection to your chosen provider
- Selecting a model for each agent crew
- Enabling Telegram/WhatsApp gateway (optional)

---

## How to Run

    npm start          # Normal chat mode
    npm run crew       # Multi-agent crew mode
    node setup.js      # Run setup wizard again

---

## Usage Examples

After running npm start:

    hello                                      # simple greeting
    who are you?                               # introduce yourself to SI BABU
    browse gold price today                    # get real-time info
    create an automatic folder backup script   # generate complete code
    fix: TypeError cannot read property        # debug and fix error
    learn document.pdf                         # learn from a document
    calculate 15% of 850000                    # calculator

For crew mode:

    npm run crew
    Enter task: create a REST API with Express

---

## Manual .env Setup

    cp .env.example .env
    nano .env

Example .env content:

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

NEVER upload your original .env file to GitHub!

---

## Supported AI Providers

| Provider | Free | Speed | Sign Up |
|----------|------|-------|---------|
| Groq | Yes | Very Fast | console.groq.com |
| NVIDIA NIM | Yes | Medium | build.nvidia.com |
| OpenRouter | Free tier available | Medium | openrouter.ai |
| Google Gemini | Free tier available | Fast | aistudio.google.com |
| OpenAI | Paid | Fast | platform.openai.com |
| Ollama | Free local | Depends on device | ollama.ai |

---

## Troubleshooting

**sqlite3 not found**

    pkg install sqlite

**NVIDIA response empty or timeout**

    AI_PROVIDER=groq

**Cannot find module**

    npm install

**Crew mode timeout**

    CREW_MODEL_BUILDER=llama-3.1-8b-instant

**WhatsApp Gateway won't connect**

    pkg install chromium

---

## Project Structure

    si-babu/
    ├── agent/
    │   ├── roles/          # chatter, builder, researcher, etc.
    │   ├── crew/           # PM, Architect, Builder, QA, Researcher
    │   └── pipeline/       # intent flow
    ├── core/               # memory, emotion engine, self-awareness
    ├── gateway/            # Telegram & WhatsApp
    ├── provider/           # NVIDIA, Groq, Gemini, etc.
    ├── tools/              # web search, file, RAG, plugins
    ├── utils/              # helper functions
    ├── main.js             # entry point for normal chat
    ├── orchestrator.js     # SI BABU's main brain
    └── setup.js            # setup wizard

---

## How to Modify

**Add a new provider** — Create provider/yourprovider.js with exported call() and stream() functions. See provider/groq.js as an example.

**Add a new agent role** — Create agent/roles/yourrole.js with exported run(ctx) function. Add it to the pipeline in agent/pipeline/.

**Add a new plugin** — Create a file in tools/plugins/yourtool.js, auto-loaded without needing to edit other files.

---

## Contributing

1. Fork this repository
2. Create a branch: git checkout -b new-feature
3. Commit: git commit -m "add feature X"
4. Push: git push origin new-feature
5. Create a Pull Request

---

## Important Notes

- This project is still in Beta and continuously evolving
- Some features are experimental
- Crew mode depends on AI provider speed
- Built as a personal project for exploration and learning
- Not a commercial product

---

<div align="center">

### Join the Community

[![Telegram Community](https://img.shields.io/badge/Telegram-Join%20SI%20BABU%20Community-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white)](https://t.me/sibabukomunitas)

---

[![GitHub](https://img.shields.io/badge/GitHub-monggosu%2Fsi--babu-181717?style=flat-square&logo=github)](https://github.com/monggosu/si-babu)
[![Built with Termux](https://img.shields.io/badge/Built%20with-Termux-black?style=flat-square&logo=android)](https://termux.dev)
[![Made in Indonesia](https://img.shields.io/badge/Made%20in-Indonesia-red?style=flat-square)](https://github.com/monggosu)

*Built with passion in Indonesia*

</div>

---

## 📋 Changelog

### v0.9.0 — Termux:API & Tool Calling (May 2026)

**New Features:**
- Termux:API integration — read SMS, send notifications, take photos (front/back), TTS, check GPS location, battery, clipboard
- LLM-based Tool Caller — SI BABU decides when to use tools, without rigid pattern matching
- Camera photos can be sent directly to Telegram
- Crew mode: simple tasks now require just 1 subtask without over-breakdown
- Builder now saves build results to the `output/` folder to avoid mixing with SI BABU code
- Setup wizard supports CLI flags: `--gateway`, `--provider`, `--identity`, `--models`, `--full`

**Bug Fixes:**
- Output checker/verifier no longer leaks to Telegram
- Self-awareness no longer returns raw technical dumps
- Chatter null check — fallback to LLM if no specific answer found
- Classifier correctly detects termux commands

---

## 🗺️ Roadmap to v1.0

This project is actively being developed toward a **v1.0 stable release**. Currently being worked on:

- [ ] Stabilize all existing features
- [ ] Self-improvement loop — SI BABU can edit its own code
- [ ] Scheduled tasks — run tasks automatically on schedule
- [ ] Voice input via Termux:API microphone
- [ ] Web UI (optional)
- [ ] Complete documentation per module
- [ ] Test coverage

If you want to contribute or have feature ideas, open an Issue or Pull Request — all feedback is welcome!

---

## 🔄 Updating SI BABU

SI BABU has a built-in auto-update feature. There are 2 ways to update:

### Method 1 — Update via Command (Recommended)
Type directly in SI BABU:

    update

SI BABU will automatically:
1. Check if there's a newer version on GitHub
2. Download the latest update
3. Install any new dependencies
4. Tell you when the update is successful

After updating, restart SI BABU:

    exit
    npm start

### Method 2 — Update Manually via Git

    cd si-babu
    git pull origin main
    npm install
    npm start

### Auto Update Notification
Every time you run `npm start`, SI BABU automatically checks for updates in the background. If there's a new version, a yellow notification appears at the top:

    ╔══════════════════════════════════════════════╗
    ║  🆕 UPDATE AVAILABLE!                        ║
    ╚══════════════════════════════════════════════╝
    Type "update" for automatic update

> **Note:** Make sure you have an active internet connection when updating. Your data and configuration (.env) will not be deleted during updates.

---

## 📢 Update Note — Real-time Browsing (v0.9.1)

Apologies to users who previously tried SI BABU's real-time browsing feature — this feature previously didn't work well and often gave inaccurate answers or couldn't find information.

**Update v0.9.1 fixes this completely:**
- SI BABU now truly fetches content from websites directly
- Results are more accurate with specific data (prices, numbers, facts)
- Mentions information sources
- 30-minute cache to avoid refetching for the same questions

Examples that now work:

    what's the gold price now?
    what's the dollar exchange rate today?
    latest news about AI
    what's the weather in Jakarta?
    what's the bitcoin price right now?

---
