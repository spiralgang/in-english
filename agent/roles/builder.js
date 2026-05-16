'use strict';

const provider = require('../../provider/router');
const fileTool = require('../../tools/file');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '../../');
const PROTECTED = [
  'main.js',
  'orchestrator.js',
  'package.json',
  '.env',
  'README.md',
];

async function run(ctx) {
  // Ambil output planner dari history kalau ada
  const plannerOutput = ctx.agentHistory
    ? ctx.agentHistory.find((h) => h.role === 'planner')?.output || ''
    : ctx.prev?.output || '';

  // Self-correction context
  const feedbackSection = ctx.checkerFeedback
    ? `\nFEEDBACK DARI REVIEW SEBELUMNYA (WAJIB DIPERBAIKI):\n${ctx.checkerFeedback}\n`
    : '';
  const wantsPython = /\b(python|\.py|pip)\b/i.test(ctx.input);
  const lang = wantsPython ? 'Python' : 'Node.js';

  const planContext = plannerOutput ? `\nRENCANA:\n${plannerOutput}\n` : '';

  const systemPrompt = `Kamu adalah Senior Software Engineer spesialis ${lang}.
Tugas kamu: tulis kode yang LANGSUNG BISA DIJALANKAN, profesional, dan bersih.

WAJIB:
- Gunakan HANYA built-in modules dulu (fs, os, path, https, child_process, readline)
- Kalau TERPAKSA pakai npm package, pilih yang paling populer dan stabil (axios, dotenv, nodemailer)
- JANGAN pakai package obscure atau yang jarang dipakai
- Semua config sensitif wajib pakai process.env
- Async/await, bukan callback
- Error handling di semua operasi async
- Kode lengkap, tidak ada placeholder atau TODO

DILARANG:
- Komentar meta seperti "kode ini tidak perlu" atau "lihat file lain"
- Package yang tidak jelas (os-utils, node-cpu-usage, dll)
- Fungsi kosong atau tidak diimplementasi
- Menyebut atau overwrite file: main.js, orchestrator.js, package.json, .env`;

  const userPrompt = `Buat ${lang} script/project LENGKAP untuk:

TASK: ${ctx.input}${planContext}${feedbackSection}

STRUKTUR OUTPUT:
Untuk setiap file, gunakan format ini PERSIS:
=== FILE: nama_file.js ===
[kode disini]
=== END FILE ===

File yang harus ada:
1. File utama (logic lengkap)
2. .env.example (kalau butuh config)
3. README.md (cara install dan jalankan, max 20 baris)

Jangan tambahkan teks apapun di luar format FILE kecuali setelah semua file selesai.`;

  let output;
  try {
    output = await provider.call(userPrompt, {
      role: 'builder',
      systemPrompt,
      maxTokens: 3000,
    });
  } catch (err) {
    return { ok: false, error: `Provider error: ${err.message}` };
  }

  if (!output || output.trim().length < 10) {
    return { ok: false, error: 'Builder output kosong' };
  }

  // Kalau output terpotong (tidak ada END FILE), tambahkan penutup
  if (output.includes('=== FILE:') && !output.includes('=== END')) {
    output += '\n=== END FILE ===';
  }

  // Normalisasi — hapus backtick fences
  const normalized = output
    .replace(/===\s*FILE:\s*(.+?)\s*===\n```[\w]*\n/g, '=== FILE: $1 ===\n')
    .replace(/\n```\n===/g, '\n===');

  const FILE_PATTERN =
    /===\s*FILE:\s*(.+?)\s*===\n([\s\S]+?)===\s*END(?:\s*FILE)?\s*===/g;
  const savedFiles = [];
  const savedPaths = new Set();
  let match;

  while ((match = FILE_PATTERN.exec(normalized)) !== null) {
    const rawPath = match[1].trim();
    const content = match[2].trim();

    if (PROTECTED.includes(path.basename(rawPath))) {
      console.log(`[builder] Skip protected: ${rawPath}`);
      continue;
    }

    const absPath = path.resolve(PROJECT_ROOT, rawPath);
    if (!absPath.startsWith(PROJECT_ROOT)) continue;
    if (savedPaths.has(absPath)) continue;

    try {
      savedPaths.add(absPath);
      await fileTool.write(absPath, content);
      savedFiles.push(rawPath);
      console.log(`[builder] Saved: ${rawPath}`);
    } catch (err) {
      console.error(`[builder] Gagal simpan ${rawPath}: ${err.message}`);
    }
  }

  return { ok: true, output, role: 'builder', savedFiles };
}

module.exports = { run };
