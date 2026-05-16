'use strict';

const provider = require('../../provider/router');

const FALLBACK = (intent) => ({
  intent,
  should_browse: false,
  confidence: 0.5,
  reason: 'fallback to classifier (decider error)',
});

function parseJSON(raw) {
  try {
    return JSON.parse(raw);
  } catch {}
  const match = raw.match(/\{[\s\S]*?\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {}
  }
  try {
    const cleaned = raw
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']')
      .replace(/'/g, '"');
    const m = cleaned.match(/\{[\s\S]*?\}/);
    if (m) return JSON.parse(m[0]);
  } catch {}
  return null;
}

async function decide(input, history = '', classifierIntent = 'chat') {
  const prompt = `Kamu adalah intent classifier untuk AI agent SI BABU.
Jawab HANYA dengan JSON, tidak ada teks lain.

INPUT: "${input}"
HISTORY: ${history || '(kosong)'}
CLASSIFIER: ${classifierIntent}

INTENT:
- chat: ngobrol, opini, sapaan, follow-up ringan, reaksi singkat
- research: butuh data internet (berita, fakta, lirik, harga, kebijakan)
- build: buat/bikin kode/script/app/bot/tool
- fix: debug/perbaiki error kode
- automation: sistem otomatis/terjadwal

BROWSE = true HANYA jika butuh data real-time/eksternal.
BROWSE = false untuk opini, chat, follow-up, pertanyaan umum.

RULE PENTING:
- Pertanyaan tentang error SISTEM/AI (bukan kode user) → chat
- Fix HANYA kalau user paste kode/stacktrace atau minta debug kode spesifik
- "error kenapa?" tanpa kode/stacktrace → chat
- kalimat pendek < 5 kata tanpa konteks teknis → chat
- follow-up pendek ("berat ga?", "yang tadi?", "trus?") → chat, no browse
- kalau ragu chat vs lainnya → pilih chat

{"intent":"...","should_browse":false,"confidence":0.0,"reason":"..."}`;

  try {
    const raw = await provider.call(prompt, {
      maxTokens: 100,
      temperature: 0.1,
    });
    const parsed = parseJSON(raw);
    if (!parsed) return FALLBACK(classifierIntent);
    const validIntents = ['chat', 'research', 'build', 'fix', 'automation'];
    if (!validIntents.includes(parsed.intent))
      return FALLBACK(classifierIntent);
    parsed.should_browse = parsed.should_browse === true;
    parsed.confidence =
      typeof parsed.confidence === 'number'
        ? Math.min(1, Math.max(0, parsed.confidence))
        : 0.7;
    return parsed;
  } catch {
    return FALLBACK(classifierIntent);
  }
}

module.exports = { decide };
