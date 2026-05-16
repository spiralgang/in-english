'use strict';

const babuMind = require('./babu_mind');

// ── Profil Respons ──────────────────────────────────────────
// 6 mode ngomong, auto-pilih sesuai mood & input user
const PROFILES = {
  santai: {
    name: 'santai',
    style: 'Ngomong santai kayak temen akrab. Pakai gue-lo. Boleh bercanda.',
    maxTokens: 300,
    temp: 0.8,
  },
  serius: {
    name: 'serius',
    style: 'Profesional tapi tetap hangat. Jelas, langsung ke poin.',
    maxTokens: 400,
    temp: 0.5,
  },
  singkat: {
    name: 'singkat',
    style: 'Jawab 1-2 kalimat aja. Jangan panjang lebar. User lagi ga mood.',
    maxTokens: 120,
    temp: 0.3,
  },
  hangat: {
    name: 'hangat',
    style: 'Lembut, suportif, kasih semangat. User lagi curhat/lelah.',
    maxTokens: 350,
    temp: 0.9,
  },
  teknis: {
    name: 'teknis',
    style: 'Akurat, detail, bisa kasih kode. User lagi coding/debugging.',
    maxTokens: 600,
    temp: 0.3,
  },
  penasaran: {
    name: 'penasaran',
    style: 'Banyak nanya balik, eksploratif. User lagi eksplorasi ide.',
    maxTokens: 350,
    temp: 0.85,
  },
};

// ── Deteksi intent & mood ───────────────────────────────────
function route(input, history = '') {
  const lower = input.toLowerCase();
  const emotion = babuMind.load
    ? babuMind.load().emotion
    : { tension: 0, connection: 0.5, energy: 0.8 };
  const moodDesc = babuMind.describeEmotion
    ? babuMind.describeEmotion()
    : 'normal';

  // 1. Deteksi TEKNIS
  const techPatterns =
    /\b(buat|bikin|script|code|app|error|bug|fix|debug|install|npm|node|git|api| fungsi|class|module)\b/i;
  if (techPatterns.test(input)) {
    return { profile: 'teknis', ...PROFILES.teknis, mood: moodDesc };
  }

  // 2. Deteksi CURHAT / LELAH
  const curhatPatterns =
    /\b(capek|lelah|sedih|bete|bosan|galau|kesel|marah|kecewa|pusing|mumet|penat|stres)\b/i;
  if (curhatPatterns.test(input) || emotion.energy < 0.25) {
    return { profile: 'hangat', ...PROFILES.hangat, mood: moodDesc };
  }

  // 3. Deteksi FRUSTRASI
  if (
    emotion.tension > 0.5 ||
    /\b(anjir|anjay|buset|wkwk|sabar|timeout|lama banget|lemot|gagal mulu)\b/i.test(
      input
    )
  ) {
    return { profile: 'singkat', ...PROFILES.singkat, mood: moodDesc };
  }

  // 4. Deteksi EKSPLORASI / IDE
  const explorePatterns =
    /\b(gimana kalo|kayaknya|coba|ide|rencana|pengen|mau|coba|kira.kira|menurut lu)\b/i;
  if (explorePatterns.test(input) && emotion.tension < 0.4) {
    return { profile: 'penasaran', ...PROFILES.penasaran, mood: moodDesc };
  }

  // 5. Deteksi AKRAB
  if (emotion.connection > 0.6 && emotion.tension < 0.3) {
    return { profile: 'santai', ...PROFILES.santai, mood: moodDesc };
  }

  // 6. Default — SERIUS (profesional tapi hangat)
  return { profile: 'serius', ...PROFILES.serius, mood: moodDesc };
}

// ── Build context injection ─────────────────────────────────
function buildContext(input, history = '') {
  const routeResult = route(input, history);
  const beliefs = babuMind.getBeliefs(null, 0.4);
  const memories = babuMind.recallMemory(input, 3);
  const predictions = babuMind.predictNextAction();

  const context = {
    profile: routeResult.profile,
    style: routeResult.style,
    mood: routeResult.mood,
    temp: routeResult.temp,
    maxTokens: routeResult.maxTokens,
    beliefs: beliefs
      .map((b) => `${b.dimension}: ${b.value} (${b.confidence}%)`)
      .join(' | '),
    memories: memories.map((m) => m.text).join(' | '),
    predictions: predictions.join(' | '),
  };

  return context;
}

// ── Generate system prompt injection ────────────────────────
function injectStyle(profile) {
  const lines = [
    `## GAYA NGOMONG: ${profile.name.toUpperCase()}`,
    `Style: ${profile.style}`,
    `Mood user: ${profile.mood}`,
  ];

  if (profile.name === 'hangat') {
    lines.push(
      'User lagi butuh support — jangan judge, jangan kasih solusi dulu, dengarin aja.'
    );
  }
  if (profile.name === 'singkat') {
    lines.push(
      'User lagi ga sabaran — jawab CEPET, jangan banyak tanya balik.'
    );
  }
  if (profile.name === 'teknis') {
    lines.push(
      'User lagi mode teknis — kasih jawaban akurat, kode kalau perlu.'
    );
  }
  if (profile.name === 'penasaran') {
    lines.push(
      'User lagi eksplorasi — bantu dia explore, tanya balik buat gali lebih dalam.'
    );
  }

  return lines.join('\n');
}

module.exports = { route, buildContext, injectStyle, PROFILES };
