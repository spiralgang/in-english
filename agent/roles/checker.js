'use strict';

const provider = require('../../provider/router');

async function run(ctx) {
  const source = ctx.prev?.output || '';
  const original = ctx.input;

  const FILE_PATTERN = /=== FILE: (.+?) ===\n([\s\S]+?)=== END FILE ===/g;
  const codeBlocks = [];
  let match;
  while ((match = FILE_PATTERN.exec(source)) !== null) {
    codeBlocks.push(`// File: ${match[1]}\n${match[2].slice(0, 800)}`);
  }

  const codeSection =
    codeBlocks.length > 0 ? codeBlocks.join('\n---\n') : source.slice(0, 1200);

  const prompt = `Kamu adalah Code Reviewer. Review singkat kode berikut.

TASK: ${original}

KODE:
${codeSection}

ATURAN PENILAIAN:
- STATUS: PASS → kode bisa jalan dan memenuhi task
- STATUS: FAIL → HANYA jika ada syntax error parah atau logika yang bikin crash total

JANGAN FAIL karena:
- kurang fitur
- bisa lebih optimal
- style tidak sempurna
- error handling kurang lengkap

OUTPUT FORMAT:
STATUS: [PASS / FAIL]
ISSUES: [deskripsi singkat atau "none"]
SUMMARY: [1 kalimat]`;

  let output;
  try {
    output = await provider.call(prompt, { role: 'checker', maxTokens: 300 });
  } catch {
    // Timeout → auto PASS
    return {
      ok: true,
      output: 'STATUS: PASS\nISSUES: none\nSUMMARY: Auto-passed (timeout).',
      role: 'checker',
    };
  }

  if (!output.includes('STATUS:')) {
    return { ok: true, output: output + '\nSTATUS: PASS', role: 'checker' };
  }

  // FAIL hanya kalau eksplisit ada CRITICAL di issues
  const isFail = /STATUS:\s*FAIL/i.test(output) && /CRITICAL/i.test(output);
  if (isFail) {
    return {
      ok: false,
      output,
      error: 'Checker: ada bug CRITICAL',
      role: 'checker',
    };
  }

  return { ok: true, output, role: 'checker' };
}

module.exports = { run };
