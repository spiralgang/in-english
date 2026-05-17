#!/usr/bin/env node
'use strict';

const readline = require('readline');
const fs       = require('fs');
const path     = require('path');
const https    = require('https');
const http     = require('http');
const { execSync, spawnSync } = require('child_process');

const ENV_FILE  = path.resolve(__dirname, '.env');
const ROOT      = __dirname;

const c = {
  reset  : '\x1b[0m',  bold   : '\x1b[1m',
  dim    : '\x1b[2m',  red    : '\x1b[31m',
  green  : '\x1b[32m', yellow : '\x1b[33m',
  cyan   : '\x1b[36m', magenta: '\x1b[35m',
  white  : '\x1b[37m',
};

const rl  = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(resolve => rl.question(q, a => resolve(a.trim())));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function clear()   { process.stdout.write('\x1bc'); }
function nl()      { console.log(); }
function log(msg)  { console.log(`  ${msg}`); }
function ok(msg)   { console.log(`  ${c.green}✓${c.reset}  ${msg}`); }
function bad(msg)  { console.log(`  ${c.red}✗${c.reset}  ${msg}`); }
function warn(msg) { console.log(`  ${c.yellow}⚠${c.reset}  ${msg}`); }
function dim(msg)  { console.log(`  ${c.dim}${msg}${c.reset}`); }
function divider() { console.log(`  ${c.dim}${'─'.repeat(52)}${c.reset}`); }

function header(step, total, title) {
  console.log(`\n  ${c.cyan}${c.bold}[${step}/${total}] ${title}${c.reset}`);
  divider();
}

function banner() {
  console.log(`${c.cyan}${c.bold}`);
  console.log('  ╔══════════════════════════════════════════════════════╗');
  console.log('  ║                                                      ║');
  console.log('  ║            SI BABU — SETUP WIZARD v2.0              ║');
  console.log('  ║                                                      ║');
  console.log('  ║   AI Agent multi-provider untuk Termux & Linux       ║');
  console.log('  ║                                                      ║');
  console.log('  ╚══════════════════════════════════════════════════════╝');
  console.log(`${c.reset}`);
  log(`${c.dim}Ketik jawaban dan tekan Enter. Kosongkan untuk skip/default.${c.reset}`);
  nl();
}

// ─── Load / Save .env ─────────────────────────────────────────────
function loadEnv() {
  const env = {};
  if (!fs.existsSync(ENV_FILE)) return env;
  fs.readFileSync(ENV_FILE, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([^#=\s][^=]*)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim();
  });
  return env;
}

function saveEnv(envObj) {
  const lines = Object.entries(envObj)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}=${v}`);
  fs.writeFileSync(ENV_FILE, lines.join('\n') + '\n');
}

// ─── Test provider ────────────────────────────────────────────────
async function testProvider(id, apiKey, model) {
  return new Promise((resolve) => {
    let hostname, pathname, useHttp = false, port;
    const headers = { 'Content-Type': 'application/json' };
    let bodyObj = { model, messages: [{ role: 'user', content: 'hi' }], max_tokens: 5 };

    if (id === 'nvidia')      { hostname = 'integrate.api.nvidia.com'; pathname = '/v1/chat/completions'; headers.Authorization = `Bearer ${apiKey}`; }
    else if (id === 'groq')   { hostname = 'api.groq.com'; pathname = '/openai/v1/chat/completions'; headers.Authorization = `Bearer ${apiKey}`; }
    else if (id === 'openrouter') { hostname = 'openrouter.ai'; pathname = '/api/v1/chat/completions'; headers.Authorization = `Bearer ${apiKey}`; headers['HTTP-Referer'] = 'https://github.com/sibabu'; headers['X-Title'] = 'SI BABU'; }
    else if (id === 'gemini') { hostname = 'generativelanguage.googleapis.com'; pathname = `/v1beta/models/${model}:generateContent?key=${apiKey}`; bodyObj = { contents: [{ parts: [{ text: 'hi' }] }], generationConfig: { maxOutputTokens: 5 } }; }
    else if (id === 'openai') { hostname = 'api.openai.com'; pathname = '/v1/chat/completions'; headers.Authorization = `Bearer ${apiKey}`; }
    else if (id === 'ollama') { hostname = apiKey || 'localhost'; pathname = '/api/chat'; useHttp = true; port = 11434; bodyObj = { model, messages: [{ role: 'user', content: 'hi' }], stream: false }; }
    else return resolve({ ok: false, error: 'Unknown provider' });

    const body = JSON.stringify(bodyObj);
    headers['Content-Length'] = Buffer.byteLength(body);
    const lib = useHttp ? http : https;

    const req = lib.request({ hostname, path: pathname, method: 'POST', headers, port }, (res) => {
      let data = '';
      res.on('data', ch => { data += ch; });
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          const t = j.choices?.[0]?.message?.content || j.candidates?.[0]?.content?.parts?.[0]?.text || j.message?.content;
          if (t) resolve({ ok: true });
          else resolve({ ok: false, error: j.error?.message || 'Response kosong' });
        } catch { resolve({ ok: false, error: data.slice(0, 60) }); }
      });
    });
    req.on('error', e => resolve({ ok: false, error: e.message }));
    req.setTimeout(12000, () => { req.destroy(); resolve({ ok: false, error: 'Timeout' }); });
    req.write(body);
    req.end();
  });
}

// ─── Provider list ────────────────────────────────────────────────
const PROVIDERS = [
  { id: 'groq',       name: 'Groq',          free: true,  keyName: 'GROQ_API_KEY',       hint: 'console.groq.com → API Keys',           defaultModel: 'llama-3.3-70b-versatile',              models: ['llama-3.3-70b-versatile','llama-3.1-8b-instant','mixtral-8x7b-32768','deepseek-r1-distill-llama-70b'] },
  { id: 'nvidia',     name: 'NVIDIA NIM',    free: true,  keyName: 'NVIDIA_API_KEY',     hint: 'build.nvidia.com → Get API Key',        defaultModel: 'meta/llama-3.3-70b-instruct',          models: ['meta/llama-3.3-70b-instruct','meta/llama-3.1-8b-instruct'] },
  { id: 'openrouter', name: 'OpenRouter',    free: true,  keyName: 'OPENROUTER_API_KEY', hint: 'openrouter.ai → Keys',                  defaultModel: 'meta-llama/llama-3.3-70b-instruct:free', models: ['meta-llama/llama-3.3-70b-instruct:free','deepseek/deepseek-r1:free','google/gemini-2.0-flash-exp:free'] },
  { id: 'gemini',     name: 'Google Gemini', free: true,  keyName: 'GEMINI_API_KEY',     hint: 'aistudio.google.com → Get API Key',     defaultModel: 'gemini-2.5-flash',                     models: ['gemini-2.5-flash','gemini-2.0-flash','gemini-1.5-pro'] },
  { id: 'openai',     name: 'OpenAI',        free: false, keyName: 'OPENAI_API_KEY',     hint: 'platform.openai.com → API Keys',        defaultModel: 'gpt-4o-mini',                          models: ['gpt-4o-mini','gpt-4o','gpt-4-turbo'] },
  { id: 'ollama',     name: 'Ollama (Local)',free: true,  keyName: null,                 hint: 'ollama.ai — jalankan: ollama pull llama3.2', defaultModel: 'llama3.2',                         models: ['llama3.2','llama3.1','mistral','codellama','deepseek-r1'] },
];

const CREW_AGENTS = [
  { key: 'CREW_MODEL_PM',         name: 'PM (Project Manager)',  desc: 'Planning & koordinasi' },
  { key: 'CREW_MODEL_ARCHITECT',  name: 'Architect',             desc: 'Desain teknis' },
  { key: 'CREW_MODEL_BUILDER',    name: 'Builder',               desc: 'Nulis kode' },
  { key: 'CREW_MODEL_QA',         name: 'QA',                    desc: 'Review kode' },
  { key: 'CREW_MODEL_RESEARCHER', name: 'Researcher',            desc: 'Riset & referensi' },
];

// ─── Install dependencies ──────────────────────────────────────────
async function installDeps() {
  header(1, 6, 'Install Dependencies');
  nl();

  // Cek node version
  const nodeVer = process.version;
  const major   = parseInt(nodeVer.slice(1));
  if (major < 16) { bad(`Node.js ${nodeVer} terlalu lama. Butuh v16+`); process.exit(1); }
  ok(`Node.js ${nodeVer}`);

  // Cek sqlite3
  try {
    execSync('sqlite3 --version', { stdio: 'ignore' });
    ok('sqlite3 tersedia');
  } catch {
    warn('sqlite3 tidak ditemukan — install: pkg install sqlite');
  }

  // npm install
  log(`\n  ${c.dim}Menginstall npm dependencies...${c.reset}`);
  const nmExists = fs.existsSync(path.join(ROOT, 'node_modules'));
  if (nmExists) {
    ok('node_modules sudah ada, skip install');
  } else {
    try {
      execSync('npm install', { cwd: ROOT, stdio: 'inherit' });
      ok('npm dependencies terinstall');
    } catch (e) {
      bad('npm install gagal: ' + e.message);
      process.exit(1);
    }
  }

  // Buat folder yang dibutuhkan
  for (const dir of ['memory', 'logs', 'output']) {
    const full = path.join(ROOT, dir);
    if (!fs.existsSync(full)) { fs.mkdirSync(full, { recursive: true }); }
  }
  ok('Folder memory/, logs/, output/ siap');
}

// ─── Identitas ────────────────────────────────────────────────────
async function setupIdentity(env) {
  header(2, 6, 'Identitas');
  nl();

  const agentName = await ask(`  ${c.cyan}Nama agent${c.reset} ${c.dim}(default: si babu)${c.reset}: `);
  env.AGENT_NAME  = agentName || env.AGENT_NAME || 'si babu';
  ok(`Nama agent: ${c.cyan}${env.AGENT_NAME}${c.reset}`);

  const userName = await ask(`  ${c.cyan}Nama kamu${c.reset} ${c.dim}(biar agent manggil nama lo)${c.reset}: `);
  if (userName) {
    // Simpan ke SQLite
    try {
      const mind = require('./core/babu_mind');
      if (mind.saveUserProfile) {
        mind.saveUserProfile({ name: userName, setupAt: new Date().toISOString() });
        ok(`Nama user "${userName}" disimpan ke SQLite`);
      }
    } catch {
      env.USER_NAME = userName;
      ok(`Nama user "${userName}" disimpan ke .env`);
    }
  }
}

// ─── Provider setup ───────────────────────────────────────────────
async function setupProvider(env) {
  header(3, 6, 'AI Provider');
  nl();

  // Tampilkan list
  PROVIDERS.forEach((p, i) => {
    const badge   = p.free ? `${c.green}GRATIS${c.reset}` : `${c.yellow}BAYAR${c.reset} `;
    const hasKey  = p.keyName ? !!env[p.keyName] : true;
    const mark    = hasKey ? `${c.green}✓${c.reset}` : `${c.dim}○${c.reset}`;
    log(`${mark} ${c.bold}${i+1}.${c.reset} ${c.cyan}${p.name.padEnd(16)}${c.reset} [${badge}]  ${c.dim}${p.id === 'groq' ? '⚡ Rekomendasi' : ''}${c.reset}`);
  });

  nl();
  const choice  = await ask(`  ${c.bold}Pilih provider utama [1-${PROVIDERS.length}]: ${c.reset}`);
  const primary = PROVIDERS[parseInt(choice) - 1] || PROVIDERS[0];
  nl();

  // Input key untuk provider yang dipilih
  log(`${c.cyan}${c.bold}Setup ${primary.name}${c.reset}`);
  dim(primary.hint);
  nl();

  let apiKey = '';
  let tested = false;

  if (primary.keyName) {
    while (true) {
      const existing = env[primary.keyName] ? ` ${c.dim}(Enter = pakai yang lama)${c.reset}` : '';
      apiKey = await ask(`  ${primary.keyName}=${existing} `);
      if (!apiKey && env[primary.keyName]) { apiKey = env[primary.keyName]; }

      if (!apiKey) { warn('API key kosong, coba lagi atau Ctrl+C untuk keluar'); continue; }

      process.stdout.write(`  Testing koneksi... `);
      const result = await testProvider(primary.id, apiKey, primary.defaultModel);
      if (result.ok) {
        console.log(`${c.green}✓ Berhasil!${c.reset}`);
        env[primary.keyName] = apiKey;
        tested = true;
        break;
      } else {
        console.log(`${c.red}✗ Gagal: ${result.error?.slice(0, 60)}${c.reset}`);
        const retry = await ask(`  Coba lagi? (y/N): `);
        if (retry.toLowerCase() !== 'y') break;
      }
    }
  } else {
    // Ollama — tanya host
    const host  = await ask(`  Ollama host ${c.dim}(default: localhost)${c.reset}: `);
    const model = await ask(`  Ollama model ${c.dim}(default: llama3.2)${c.reset}: `);
    env.OLLAMA_HOST  = host  || 'localhost';
    env.OLLAMA_MODEL = model || 'llama3.2';
    env.OLLAMA_PORT  = '11434';

    process.stdout.write(`  Testing Ollama... `);
    const result = await testProvider('ollama', env.OLLAMA_HOST, env.OLLAMA_MODEL);
    console.log(result.ok ? `${c.green}✓ OK${c.reset}` : `${c.red}✗ Gagal (pastiin ollama jalan)${c.reset}`);
    tested = result.ok;
  }

  env.AI_PROVIDER = primary.id;
  ok(`Provider utama: ${c.cyan}${primary.name}${c.reset}`);

  // Provider fallback (opsional)
  nl();
  const addFallback = await ask(`  Tambah provider fallback? ${c.dim}(y/N)${c.reset}: `);
  if (addFallback.toLowerCase() === 'y') {
    const others = PROVIDERS.filter(p => p.id !== primary.id);
    others.forEach((p, i) => {
      const badge = p.free ? `${c.green}GRATIS${c.reset}` : `${c.yellow}BAYAR${c.reset}`;
      log(`  ${c.bold}${i+1}.${c.reset} ${c.cyan}${p.name.padEnd(14)}${c.reset} [${badge}]`);
    });
    nl();
    const fbChoice = await ask(`  Pilih fallback [1-${others.length}] atau Enter untuk skip: `);
    const fallback = others[parseInt(fbChoice) - 1];
    if (fallback?.keyName) {
      dim(fallback.hint);
      const fbKey = await ask(`  ${fallback.keyName}= `);
      if (fbKey) {
        process.stdout.write(`  Testing ${fallback.name}... `);
        const r = await testProvider(fallback.id, fbKey, fallback.defaultModel);
        console.log(r.ok ? `${c.green}✓ OK${c.reset}` : `${c.yellow}⚠ Gagal, disimpan tapi mungkin tidak jalan${c.reset}`);
        env[fallback.keyName] = fbKey;
      }
    }
  }

  return primary;
}

// ─── Model per crew agent ─────────────────────────────────────────
async function setupCrewModels(env, primary) {
  header(4, 6, 'Model per Crew Agent');
  nl();
  log(`Provider: ${c.cyan}${primary.name}${c.reset}`);
  nl();
  log(`Pilih model untuk setiap agent crew.`);
  log(`${c.dim}Kosongkan untuk pakai default: ${primary.defaultModel}${c.reset}`);
  nl();

  const models = primary.models || [primary.defaultModel];

  models.forEach((m, i) => {
    log(`  ${c.dim}${i+1}. ${m}${c.reset}`);
  });
  nl();

  for (const agent of CREW_AGENTS) {
    const existing = env[agent.key] ? ` ${c.dim}(sekarang: ${env[agent.key]})${c.reset}` : '';
    const input    = await ask(`  ${c.cyan}${agent.name.padEnd(20)}${c.reset}${c.dim}(${agent.desc})${c.reset}${existing}\n  Nomor model [1-${models.length}] atau Enter default: `);
    const idx      = parseInt(input) - 1;
    env[agent.key] = (idx >= 0 && models[idx]) ? models[idx] : (env[agent.key] || primary.defaultModel);
    ok(`${agent.name}: ${c.dim}${env[agent.key]}${c.reset}`);
    nl();
  }
}

// ─── Gateway ──────────────────────────────────────────────────────
async function setupGateway(env) {
  header(5, 6, 'Gateway (Opsional)');
  nl();
  log('Gateway memungkinkan SI BABU diakses via Telegram atau WhatsApp.');
  nl();

  const tg = await ask(`  Aktifkan Telegram Gateway? ${c.dim}(y/N)${c.reset}: `);
  if (tg.toLowerCase() === 'y') {
    dim('Buat bot di @BotFather di Telegram, copy token-nya');
    const token = await ask(`  TELEGRAM_BOT_TOKEN= `);
    if (token) {
      env.TELEGRAM_BOT_TOKEN   = token;
      env.TELEGRAM_GATEWAY     = 'true';
      ok('Telegram Gateway aktif');
    }
  }

  nl();
  const wa = await ask(`  Aktifkan WhatsApp Gateway? ${c.dim}(y/N)${c.reset}: `);
  if (wa.toLowerCase() === 'y') {
    dim('Butuh Twilio account atau whatsapp-web.js');
    const waMode = await ask(`  Mode: 1. Twilio  2. whatsapp-web.js [1/2]: `);
    env.WA_GATEWAY = 'true';
    env.WA_MODE    = waMode === '2' ? 'wwebjs' : 'twilio';
    if (waMode !== '2') {
      const sid    = await ask(`  TWILIO_ACCOUNT_SID= `);
      const token  = await ask(`  TWILIO_AUTH_TOKEN= `);
      const number = await ask(`  TWILIO_WHATSAPP_NUMBER= `);
      if (sid)    env.TWILIO_ACCOUNT_SID      = sid;
      if (token)  env.TWILIO_AUTH_TOKEN       = token;
      if (number) env.TWILIO_WHATSAPP_NUMBER  = number;
    }
    ok(`WhatsApp Gateway aktif (${env.WA_MODE})`);
  }
}

// ─── Summary ──────────────────────────────────────────────────────
async function showSummary(env, primary) {
  header(6, 6, 'Selesai!');
  nl();
  saveEnv(env);
  ok('.env tersimpan');
  nl();
  divider();
  nl();

  log(`${c.bold}Konfigurasi:${c.reset}`);
  log(`  Agent    : ${c.cyan}${env.AGENT_NAME}${c.reset}`);
  log(`  Provider : ${c.cyan}${primary.name}${c.reset}`);
  log(`  Model PM : ${c.dim}${env.CREW_MODEL_PM || primary.defaultModel}${c.reset}`);
  log(`  Builder  : ${c.dim}${env.CREW_MODEL_BUILDER || primary.defaultModel}${c.reset}`);
  if (env.TELEGRAM_GATEWAY === 'true') log(`  Telegram : ${c.green}Aktif${c.reset}`);
  if (env.WA_GATEWAY === 'true')       log(`  WhatsApp : ${c.green}Aktif${c.reset}`);
  nl();
  divider();
  nl();
  log(`${c.bold}${c.green}Cara menjalankan:${c.reset}`);
  nl();
  log(`  ${c.cyan}npm start${c.reset}        ${c.dim}— Chat biasa${c.reset}`);
  log(`  ${c.cyan}npm run crew${c.reset}     ${c.dim}— Mode multi-agent${c.reset}`);
  log(`  ${c.cyan}node setup.js${c.reset}    ${c.dim}— Jalankan wizard ini lagi${c.reset}`);
  nl();
  divider();
  nl();
}

// ─── Main ─────────────────────────────────────────────────────────
async function main() {
  clear();
  banner();

  const env = loadEnv();

  const arg = process.argv[2];

  const MENU = {
    '1': { label: 'Identitas (nama agent & user)',     fn: () => setupIdentity(env) },
    '2': { label: 'AI Provider & API Key',             fn: async () => { const p = await setupProvider(env); saveEnv(env); return p; } },
    '3': { label: 'Model per Crew Agent',              fn: async () => {
      const primary = PROVIDERS.find(p => p.id === (env.AI_PROVIDER || 'groq')) || PROVIDERS[0];
      await setupCrewModels(env, primary);
    }},
    '4': { label: 'Gateway (Telegram / WhatsApp)',     fn: () => setupGateway(env) },
    '5': { label: 'Full Setup (semua langkah)',        fn: null },
  };

  const FLAG_MAP = {
    '--identity' : '1',
    '--provider' : '2',
    '--models'   : '3',
    '--gateway'  : '4',
    '--full'     : '5',
  };

  let choice = FLAG_MAP[arg] || null;

  if (!choice) {
    console.log(`  ${c.cyan}${c.bold}Mau setup bagian apa?${c.reset}\n`);
    Object.entries(MENU).forEach(([k, v]) => {
      console.log(`  ${c.bold}${k}.${c.reset} ${v.label}`);
    });
    console.log();
    choice = await ask(`  Pilih [1-5]: `);
  }

  if (!MENU[choice]) {
    bad('Pilihan tidak valid.');
    rl.close();
    process.exit(1);
  }

  if (choice === '5') {
    await installDeps();
    await setupIdentity(env);
    const primary = await setupProvider(env);
    await setupCrewModels(env, primary);
    await setupGateway(env);
    await showSummary(env, primary);
  } else {
    console.log(`\n  ${c.cyan}${c.bold}Setup: ${MENU[choice].label}${c.reset}\n`);
    await MENU[choice].fn();
    saveEnv(env);
    ok('.env tersimpan');
    nl();
    log(`${c.green}Selesai! Restart SI BABU untuk menerapkan perubahan.${c.reset}`);
    nl();
  }

  rl.close();
  process.exit(0);
}

main().catch(err => {
  bad(`Error: ${err.message}`);
  process.exit(1);
});
