'use strict';

// ─── Prompt Compressor ───────────────────────────────────────
// Mengurangi token dengan:
// 1. Auto-summarize history panjang
// 2. Hapus kata-kata tidak penting
// 3. Batasi context ke yang paling relevan

const STOPWORDS = new Set([
  'yang',
  'dan',
  'di',
  'ke',
  'dari',
  'untuk',
  'dengan',
  'adalah',
  'ini',
  'itu',
  'ada',
  'pada',
  'tidak',
  'bisa',
  'akan',
  'sudah',
  'juga',
  'atau',
  'saya',
  'gue',
  'lo',
  'kamu',
  'anda',
  'the',
  'is',
  'are',
  'was',
  'a',
  'an',
  'of',
  'to',
  'in',
  'it',
]);

function compress(input, maxChars = 200) {
  if (input.length <= maxChars) return input;

  // 1. Potong kalimat tidak penting
  const sentences = input.split(/[.!?]+/).filter((s) => s.trim().length > 5);

  // 2. Ambil kalimat yang paling informatif (ada kata kunci)
  const keywords = [
    'error',
    'bug',
    'fix',
    'buat',
    'bikin',
    'script',
    'kode',
    'memory',
    'sqlite',
    'upgrade',
    'test',
  ];
  const scored = sentences.map((s) => ({
    text: s.trim(),
    score:
      keywords.filter((k) => s.toLowerCase().includes(k)).length * 2 +
      s.length / 50,
  }));

  // 3. Sort dan ambil top sentences
  const top = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.text)
    .join('. ');

  // 4. Potong lagi kalau masih kepanjangan
  if (top.length > maxChars) {
    // Hapus stopwords
    const words = top
      .split(/\s+/)
      .filter((w) => !STOPWORDS.has(w.toLowerCase()));
    return words.slice(0, Math.floor(maxChars / 5)).join(' ') + '...';
  }

  return top;
}

function compressHistory(history, maxChars = 150) {
  if (!history || !history.length) return '';
  if (history.length <= 3) return history.join('\n').slice(0, maxChars);

  // Ambil 1 pesan terakhir + 1 pesan paling relevan dari sisanya
  const last = history[history.length - 1];
  const rest = history.slice(0, -1);

  let mostRelevant = rest[rest.length - 1]; // default: paling baru
  const keywords = [
    'error',
    'bug',
    'test',
    'buat',
    'bikin',
    'tanya',
    'tadi',
    'sebelum',
  ];
  for (const msg of rest) {
    if (keywords.some((k) => msg.toLowerCase().includes(k))) {
      mostRelevant = msg;
      break;
    }
  }

  return compress(`${mostRelevant}. ${last}`, maxChars);
}

module.exports = { compress, compressHistory };
