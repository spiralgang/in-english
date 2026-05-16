'use strict';

const provider = require('../../provider/router');

async function run(ctx) {
  const source = (ctx.prev?.output || ctx.input).slice(0, 800);
  const skillHint = ctx.skillMatch
    ? ctx.skillMatch.summary?.slice(0, 150)
    : 'none';
  const tone = ctx.tone || 'santai';

  const prompt = `Kamu adalah Project Planner.
Buat rencana eksekusi untuk task berikut.

TASK: ${ctx.input}

REQUIREMENT:
${source}

REFERENSI: ${skillHint}
GAYA USER: ${tone}

PENTING: Task sudah JELAS — langsung buat rencana.
Jangan output CLARIFICATION_NEEDED kecuali benar-benar tidak bisa dimengerti.

OUTPUT FORMAT (wajib):
GOAL: [tujuan akhir]

STEPS:
1. [langkah 1]
2. [langkah 2]

TECH_STACK: [teknologi]
COMPLEXITY: [low/medium/high]
NOTES: [atau "none"]`;

  let output;
  try {
    output = await provider.call(prompt, { role: 'planner', maxTokens: 1000 });
  } catch (err) {
    return { ok: false, error: `Provider error: ${err.message}` };
  }

  if (output.trimStart().startsWith('CLARIFICATION_NEEDED')) {
    return {
      ok: false,
      error: 'Task ambigu',
      clarification: output.replace('CLARIFICATION_NEEDED:', '').trim(),
    };
  }

  if (!output.includes('GOAL:') || !output.includes('STEPS:')) {
    return { ok: false, error: 'Output planner tidak sesuai format' };
  }

  return { ok: true, output, role: 'planner' };
}

module.exports = { run };
