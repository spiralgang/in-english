'use strict';

const provider = require('../../provider/router');
const searchWeb = require('../../tools/search_web');
const extractor = require('../../tools/search_extractor');

async function run(ctx) {
  const input = ctx.input;
  const tone = ctx.tone || 'santai';

  console.log(`[researcher] Processing: "${input}"`);

  // ============ PRIORITAS 1: EXTRACTOR LANGSUNG ============
  // Untuk query yang bisa dijawab pake API (harga, cuaca, wiki, dll)
  const exactResult = await extractor.extract(input);
  if (exactResult) {
    const formatted = extractor.formatResult(exactResult);
    if (formatted) {
      console.log(`[researcher] Exact result from ${exactResult.source}`);
      return { ok: true, output: formatted, role: 'researcher' };
    }
  }

  // ============ PRIORITAS 2: WEB SEARCH + RANGKUM ============
  console.log('[researcher] No exact match, searching web...');
  const webResults = await searchWeb.search(input, 3);

  if (!webResults || webResults.length === 0) {
    return {
      ok: true,
      output: `Gue udah cari "${input}" tapi gak nemu hasil yang relevan. Coba pake kata kunci yang lebih spesifik ya.`,
      role: 'researcher',
    };
  }

  // Format hasil web untuk LLM
  let webContext = '';
  for (let i = 0; i < Math.min(webResults.length, 3); i++) {
    const r = webResults[i];
    webContext += `\n--- Hasil ${i + 1}: ${r.title} ---\nURL: ${r.url}\nSnippet: ${r.snippet}\n`;
  }

  // Minta LLM rangkum dari hasil search
  const prompt = `Berdasarkan hasil pencarian berikut, jawab pertanyaan user.

PERTANYAAN: ${input}

HASIL PENCARIAN:
${webContext}

JAWAB:
- Gunakan bahasa Indonesia santai (gue/lo)
- Kalau ada angka/nominal, sebutkan persis dari hasil
- Jangan ngomong "berdasarkan data yang gue punya" — sebut sumbernya
- Jangan mengarang fakta yang gak ada di hasil search

Jawaban:`;

  let output;
  try {
    output = await provider.call(prompt, {
      role: 'researcher',
      maxTokens: 500,
      temperature: 0.3,
    });
  } catch (err) {
    output = `Gue dapet hasil dari ${webResults[0]?.title || 'pencarian'}: ${webResults[0]?.snippet || 'coba buka link nya langsung ya'}`;
  }

  return { ok: true, output, role: 'researcher' };
}

module.exports = { run };
