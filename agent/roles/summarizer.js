'use strict';

// Summarizer sekarang cuma passing-through, karena researcher udah kasih jawaban final
async function run(ctx) {
  const prevOutput = ctx.prev?.output || '';

  if (!prevOutput || prevOutput.trim().length === 0) {
    return {
      ok: true,
      output: 'Gak ada hasil dari pencarian.',
      role: 'summarizer',
    };
  }

  // Langsung balikin output researcher (udah diformat)
  return { ok: true, output: prevOutput, role: 'summarizer' };
}

module.exports = { run };
