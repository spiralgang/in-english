/**
 * utils/continuation.js — Anti output kepotong
 * Cek apakah output terlihat terpotong, beri marker jika iya
 */

'use strict';

// Tanda output sudah selesai
const COMPLETE_ENDINGS = ['.', '!', '?', '```', '---', 'none', 'n/a', ']', ')'];

const INCOMPLETE_SIGNALS = [
  // Kalimat terpotong di tengah
  /\w{3,}$/, // diakhiri kata tanpa tanda baca
  /,$/, // diakhiri koma
  /\band\s*$/i, // diakhiri "and"
  /\bdan\s*$/i, // diakhiri "dan"
  /\bthe\s*$/i,
  /\byaitu\s*$/i,
];

function isComplete(text) {
  const trimmed = text.trimEnd();
  const tail = trimmed.slice(-20).toLowerCase();

  // Cek ending yang valid
  for (const ending of COMPLETE_ENDINGS) {
    if (tail.endsWith(ending)) return true;
  }

  // Cek sinyal tidak lengkap
  for (const signal of INCOMPLETE_SIGNALS) {
    if (signal.test(trimmed)) return false;
  }

  return true;
}

function process(text) {
  if (!text || text.trim().length === 0) return text;

  const trimmed = text.trimEnd();

  if (!isComplete(trimmed)) {
    return (
      trimmed +
      '\n\n[⚠️ Output mungkin terpotong. Ketik "lanjut" untuk melanjutkan.]'
    );
  }

  return trimmed;
}

module.exports = { process, isComplete };
