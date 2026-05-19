'use strict';

const BUILD_PATTERNS = [
  /\b(buat|bikin|buatin|bikinin|bikinin|create|build|generate|develop|implement|buatkan)\s+\w/i,
  /\b(script|bot|app|aplikasi|website|web|api|backend|frontend|cli|tool|sistem|program|fungsi|fitur|endpoint|webhook|gateway|server)\b/i,
  /\b(tambah|add|refactor|update|upgrade|patch)\s+(fitur|feature|fungsi|kode|code|script|endpoint)\b/i,
  /\b(buatkan|buat|bikin)\s+(function|fungsi|class|method|module|component)\b/i,
];

const FIX_PATTERNS = [
  /\b(error|bug|crash|exception|traceback)\b.{0,60}(ini|berikut|:\s*[\n`])/i,
  /\bfix\s+(bug|error|masalah|kode|ini)\b/i,
  /\b(debug|perbaiki)\s+(kode|script|program|fungsi)\b/i,
  /\b(error|exception)\b.{40,}/i,
  /\bada\s+(bug|error|masalah)\b/i,
  /\b(tolong|coba)\s+(perbaiki|fixkan|benerin|debug)\b/i,
  /\b(kenapa|knp)\s+error\b/i,
  /\bfix\s+(dong|deh|ini|kode)\b/i,
  /\bbenerin\s+(dong|deh|ini|kode)\b/i,
  /ReferenceError|TypeError|SyntaxError|RangeError/,
];

const AUTOMATION_PATTERNS = [
  /\b(otomatis|automate|automation|automasi)\b/i,
  /\b(jadwal|schedule|cron|setiap)\s+.{0,30}\s*(menit|jam|hari|minggu|detik)\b/i,
  /\b(trigger|monitor|watch|daemon|background|service)\b/i,
  /\b(deploy|ci|cd|pipeline|workflow)\b/i,
];

const CALC_PATTERN = /\bhitung\b.*[0-9]|[0-9].*[+\-*\/].*[0-9]/;

const RESEARCH_PATTERNS = [
  /\b(cari|cariin|search|googling|browsing|temuin)\b.{2,}/i,
  /\b(berita|news|info\s+terbaru|update\s+terbaru)\b/i,
  /\bapa\s+itu\s+\w+/i,
  /\bjelaskan\s+(apa|cara|kenapa|bagaimana|tentang)\b/i,
  /\b(perbedaan|bedanya|compare|vs)\s+\w+\s+(dan|dengan|vs)\s+\w+/i,
  /\b(tutorial|cara\s+pakai|cara\s+install|cara\s+setup)\b/i,
  /\b(rekomendasi|rekomendasiin)\s+\w+/i,
  /\b(lirik|arti\s+lagu|terjemahan\s+lagu)\b/i,
  /\b(harga|cuaca|kurs)\b/i,
];

// Selalu chat — jangan dilempar ke pipeline lain
const STRONG_CHAT = [
  /^(halo|hai|hi|hello|hey|yo|woy|oi)\s*[!?.]?\s*$/i,
  /^(ok|oke|sip|siap|iya|ya|nah)\s*[!?.]?\s*$/i,
  /^(makasih|thanks|mantap|keren|bagus)\s*[!?.]?\s*$/i,
  /^(bye|dadah)\s*[!?.]?\s*$/i,
  /\bmenurut\s+(lu|lo|kamu)\b/i,
  /\b(lu|lo)\s+(pikir|rasa|tau|kenal)\b/i,
  /\b(bagus|jelek|worth|berat|ringan)\s+(ga|gak|ngga)\b/i,
  /\b(serius|beneran|masa\s+sih)\s*[?!]?\s*$/i,
  /\b(lu|lo)\s+(masih|beneran|yakin|ngawur|halu)\b/i,
  // Tampilkan/lihat file — bukan build!
  /\b(tampilkan|tampil|perlihatkan|show)\s+[\w.\/-]+\.(js|py|ts|json|txt|md|env|sh|css|html|java)\b/i,
  /\b(tampilkan|tampil|perlihatkan|show)\s+[\w.\/-]+\s+(dan|&)\s+[\w.\/-]+/i,
];

function wordCount(s) {
  return s.trim().split(/\s+/).length;
}

function classify(input) {
  // Termux:API commands — harus chat bukan research
  const TERMUX_CMDS = [
    /\b(cek|ambil|lihat|baca)\s*(lokasi|gps|sms|baterai|clipboard|foto|kamera)\b/i,
    /\b(bacain|ucapkan|tts|speak)\b/i,
    /\b(kasih|kirim)\s*(notif|notifikasi)\b/i,
    /\b(getar|vibrate|toast)\b/i,
    /\bfoto\s*(kamera|depan|belakang)\b/i,
  ];
  if (TERMUX_CMDS.some(r => r.test(input))) return 'chat';

  if (!input || !input.trim()) return 'chat';
  const t = input.trim();

  if (t.length < 6) return 'chat';
  if (wordCount(t) <= 2 && !/\b(error|bug|fix|buat|cari)\b/i.test(t))
    return 'chat';
  if (
    STRONG_CHAT.some(function (r) {
      return r.test(t);
    }) &&
    !BUILD_PATTERNS.some(function (r) {
      return r.test(t);
    }) &&
    !FIX_PATTERNS.some(function (r) {
      return r.test(t);
    })
  ) {
    return 'chat';
  }
  // Pertanyaan konseptual/diskusi → chat
  if (
    /\b(startup|bisnis|karir|hidup|masa depan|mulai dari mana|tips|saran)\b/i.test(
      t
    ) &&
    !/\b(buat|bikin|script|kode|app)\b/i.test(t)
  )
    return 'chat';
  if (CALC_PATTERN.test(t)) return 'research'; // research → ReAct → calculator plugin

  // Pertanyaan tentang si babu sendiri → chat
  if (
    /\b(si babu|sibabu)\b/i.test(t) &&
    !/\b(buat|bikin|build|create)\b/i.test(t)
  )
    return 'chat';
  if (/\b(bisa ga|bisa gak|sanggup|mampu ga)\b/i.test(t)) return 'chat';
  if (/\b(kira.kira|emang bisa|memangnya)\b/i.test(t)) return 'chat';
  if (/\b(apasih|apa sih|ngapain|buat apaan)\b/i.test(t)) return 'chat';
  if (/\b(kalo gw suruh|kalau gw suruh)\b/i.test(t)) return 'chat';

  if (t.length < 50 && /error|eror|gagal/i.test(t) && t.indexOf(':') === -1)
    return 'chat';

  if (
    FIX_PATTERNS.some(function (r) {
      return r.test(t);
    })
  )
    return 'fix';
  if (
    BUILD_PATTERNS.some(function (r) {
      return r.test(t);
    })
  )
    return 'build';
  if (
    AUTOMATION_PATTERNS.some(function (r) {
      return r.test(t);
    })
  )
    return 'automation';
  if (
    RESEARCH_PATTERNS.some(function (r) {
      return r.test(t);
    })
  )
    return 'research';

  return 'chat';
}

module.exports = { classify };
