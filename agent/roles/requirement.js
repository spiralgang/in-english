'use strict';

const provider = require('../../provider/router');

// Keyword yang menandakan intent sudah jelas — skip klarifikasi
const CLEAR_INTENT_PATTERNS = [
  /\b(bot\s+telegram|telegram\s+bot)\b/i,
  /\b(web\s+scraper|scraping)\b/i,
  /\b(rename\s+file|batch\s+rename)\b/i,
  /\b(todo\s+app|todo\s+list)\b/i,
  /\b(rest\s+api|graphql\s+api)\b/i,
  /\b(discord\s+bot)\b/i,
  /\b(chat\s+bot|chatbot)\b/i,
  /\b(cli\s+tool|command.line)\b/i,
  /\b(crud\s+app)\b/i,
  /\b(login\s+system|auth\s+system)\b/i,
];

function isIntentClear(input) {
  return CLEAR_INTENT_PATTERNS.some((r) => r.test(input));
}

async function run(ctx) {
  const tone = ctx.tone || 'santai';
  const clear = isIntentClear(ctx.input);

  const prompt = `Kamu adalah Requirements Analyst untuk project software.
Analisis input user dan buat requirement yang jelas.

INPUT: ${ctx.input}
GAYA USER: ${tone}

${
  clear
    ? `PENTING: Intent user SUDAH JELAS. 
Langsung buat requirement tanpa minta klarifikasi.
Gunakan asumsi default yang reasonable.`
    : `Jika input JELAS → langsung buat requirement.
Jika AMBIGU → output: CLARIFICATION_NEEDED: [pertanyaan singkat]
Ambigu = tidak bisa sama sekali dibuat tanpa info tambahan.
JANGAN terlalu perfeksionis — kalau bisa diasumsikan, asumsikan saja.`
}

FORMAT (jika jelas):
GOAL:
[tujuan utama]

FUNCTIONAL_REQUIREMENTS:
- FR1: [requirement 1]
- FR2: [requirement 2]

ASSUMPTIONS:
- [asumsi default yang dipakai]

OUT_OF_SCOPE:
- [yang tidak dikerjakan, atau "none"]`;

  let output;
  try {
    output = await provider.call(prompt, { maxTokens: 600 });
  } catch (err) {
    return { ok: false, error: `Provider error: ${err.message}` };
  }

  if (output.trimStart().startsWith('CLARIFICATION_NEEDED')) {
    return {
      ok: false,
      error: 'Task perlu klarifikasi',
      clarification: output.replace('CLARIFICATION_NEEDED:', '').trim(),
      role: 'requirement',
    };
  }

  if (
    !output.includes('GOAL:') ||
    !output.includes('FUNCTIONAL_REQUIREMENTS:')
  ) {
    return {
      ok: false,
      error: 'Output requirement tidak sesuai format',
      role: 'requirement',
    };
  }

  return { ok: true, output, role: 'requirement' };
}

module.exports = { run };
