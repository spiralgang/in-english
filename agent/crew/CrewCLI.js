'use strict';

require('dotenv').config();

const readline = require('readline');
const { createCrew } = require('./index');

const AGENT_STYLES = {
  PM: { color: '\x1b[33m\x1b[1m', label: 'PM         ', badge: '👑' },
  Architect: { color: '\x1b[35m\x1b[1m', label: 'Architect  ', badge: '🏛️ ' },
  Researcher: { color: '\x1b[36m\x1b[1m', label: 'Researcher ', badge: '🔍' },
  Builder: { color: '\x1b[32m\x1b[1m', label: 'Builder    ', badge: '⚙️ ' },
  QA: { color: '\x1b[31m\x1b[1m', label: 'QA         ', badge: '🔬' },
};

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';

let totalSubtasks = 0;
let doneSubtasks = 0;
let currentAgent = '';
let startTime = null;
let messageCount = 0;

function progressBar(done, total, width = 20) {
  if (total === 0) return '░'.repeat(width);
  const filled = Math.round((done / total) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

function elapsed() {
  if (!startTime) return '0s';
  const ms = Date.now() - startTime;
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function printHeader(taskDesc) {
  console.clear();
  console.log(`${CYAN}${BOLD}`);
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║              SI BABU — CREW LIVE SESSION                 ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  Task : ${taskDesc.slice(0, 49).padEnd(49)}║`);
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`${RESET}`);
}

function printStatus() {
  const pct =
    totalSubtasks > 0 ? Math.round((doneSubtasks / totalSubtasks) * 100) : 0;
  const bar = progressBar(doneSubtasks, totalSubtasks);
  process.stdout.write(
    `\n${DIM}${'─'.repeat(60)}${RESET}\n` +
      `${DIM}  Progress : [${bar}] ${pct}% (${doneSubtasks}/${totalSubtasks || '?'})${RESET}\n` +
      `${DIM}  Active   : ${currentAgent || '-'} | Elapsed: ${elapsed()} | Messages: ${messageCount}${RESET}\n` +
      `${DIM}${'─'.repeat(60)}${RESET}\n`
  );
}

function printMessage(msg) {
  const style = AGENT_STYLES[msg.role] || {
    color: '\x1b[37m',
    label: msg.role.padEnd(11),
    badge: '🤖',
  };
  const time = new Date(msg.ts).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  currentAgent = msg.role;
  messageCount++;

  if (msg.message.includes('── Subtask')) {
    const match = msg.message.match(/(\d+)\/(\d+)/);
    if (match) {
      doneSubtasks = parseInt(match[1]) - 1;
      totalSubtasks = parseInt(match[2]);
    }
  }
  if (msg.message.includes('Subtask') && msg.message.includes('selesai')) {
    doneSubtasks++;
  }

  const lines = msg.message.split('\n');
  const prefix = `${style.color}${style.badge} [${style.label}]${RESET} `;
  const indent = ' '.repeat(16);

  console.log(`\n${DIM}${time}${RESET}`);
  lines.forEach((line, i) => {
    if (line.trim() === '') return;
    if (i === 0) {
      console.log(`${prefix}${style.color}${line}${RESET}`);
    } else {
      console.log(`${indent}${DIM}${line}${RESET}`);
    }
  });
}

async function main() {
  const provider = process.env.AI_PROVIDER || 'nvidia';
  const keyMap = {
    nvidia: 'NVIDIA_API_KEY',
    gemini: 'GEMINI_API_KEY',
    openai: 'OPENAI_API_KEY',
  };
  const key = keyMap[provider];

  if (key && !process.env[key]) {
    console.error(`${RED}[ERROR] ${key} belum di-set di .env${RESET}`);
    process.exit(1);
  }

  console.clear();
  console.log(`${YELLOW}${BOLD}`);
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║              SI BABU — CREW MODE                         ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║  Tim Agent:                                              ║');
  console.log('║  👑 Project Manager  — Koordinator & decision maker      ║');
  console.log('║  🏛️  Architect        — Rancang struktur teknis           ║');
  console.log('║  🔍 Researcher       — Riset & best practices            ║');
  console.log('║  ⚙️  Builder          — Tulis kode                        ║');
  console.log('║  🔬 QA               — Review & quality control          ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`${RESET}`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const taskDesc = await new Promise((resolve) => {
    rl.question(`${CYAN}${BOLD}Masukkan task untuk tim: ${RESET}`, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });

  if (!taskDesc) {
    console.log(`${RED}Task tidak boleh kosong.${RESET}`);
    process.exit(0);
  }

  printHeader(taskDesc);
  startTime = Date.now();
  console.log(`${DIM}Tim sedang bersiap...${RESET}\n`);

  const crew = createCrew(printMessage);

  let finalResult;
  try {
    finalResult = await crew.pm.run(taskDesc);
  } catch (err) {
    console.error(`\n${RED}${BOLD}[FATAL ERROR] ${err.message}${RESET}`);
    console.error(err.stack);
    process.exit(1);
  }

  printStatus();

  if (finalResult.ok) {
    console.log(`\n${GREEN}${BOLD}${'═'.repeat(60)}${RESET}`);
    if (finalResult.approved) {
      console.log(`${GREEN}${BOLD}  ✅ PROJECT SELESAI & APPROVED!${RESET}`);
    } else {
      console.log(
        `${YELLOW}${BOLD}  ⚠️  PROJECT SELESAI (dengan catatan)${RESET}`
      );
    }
    if (finalResult.savedFiles?.length) {
      console.log(
        `${DIM}  Files: ${finalResult.savedFiles.join(', ')}${RESET}`
      );
    }
    console.log(`${DIM}  Total waktu: ${elapsed()}${RESET}`);
    console.log(`${GREEN}${BOLD}${'═'.repeat(60)}${RESET}\n`);
  } else {
    console.log(`\n${RED}${BOLD}  ❌ PROJECT GAGAL${RESET}\n`);
  }

  process.exit(0);
}

process.on('SIGINT', () => {
  console.log(`\n\n${YELLOW}Session dihentikan.${RESET}\n`);
  process.exit(0);
});

main().catch((err) => {
  console.error(`${RED}[FATAL] ${err.message}${RESET}`);
  process.exit(1);
});
