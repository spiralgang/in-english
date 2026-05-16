/**
 * roles/architect.js — Rancang arsitektur teknis (no coding)
 */
'use strict';

const provider = require('../../provider/router');

async function run(ctx) {
  // Potong context — ambil yang paling penting saja
  const source = (ctx.prev?.output || ctx.input).slice(0, 800);
  const skillHint = ctx.skillMatch
    ? ctx.skillMatch.summary?.slice(0, 150)
    : 'none';

  const prompt = `Kamu adalah Software Architect senior.
Rancang arsitektur teknis. JANGAN tulis kode.

TASK: ${ctx.input}

PLAN:
${source}

REFERENSI: ${skillHint}

OUTPUT FORMAT (wajib):
TECH_STACK:
- Runtime: [...]
- Language: [...]
- Libraries: [...]

FILE_STRUCTURE:
[struktur folder/file]

MODULES:
- [modul]: [tanggung jawab]

DATA_FLOW:
[alur data singkat]

RISKS:
- [potensi masalah atau "none"]`;

  let output;
  try {
    output = await provider.call(prompt, { maxTokens: 1500 });
  } catch (err) {
    return { ok: false, error: `Provider error: ${err.message}` };
  }

  if (!output.includes('TECH_STACK:') || !output.includes('FILE_STRUCTURE:')) {
    return {
      ok: false,
      error: 'Output architect tidak sesuai format',
      role: 'architect',
    };
  }

  return { ok: true, output, role: 'architect' };
}

module.exports = { run };
