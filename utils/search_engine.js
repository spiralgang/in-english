'use strict';

const searchWeb = require('../tools/search_web');
const fetchUrl = require('../tools/fetch_url');

// Wajib browse
const MUST_BROWSE = [
  /\b(berita|news|terbaru|terkini|hari ini|kemarin)\b/i,
  /\b(harga|cuaca|gempa|banjir|trending|viral)\b/i,
  /\b(lirik|arti\s+lagu)\b/i,
  /\b(cari|cariin|search|cek|temuin)\b.{3,}/i,
  /\b(kebijakan|peraturan)\s+\w+/i,
  /\b(openclaw|hermes|droidclaw|nanobot|picoclaw)\b/i,
  /\b(saran|rekomendasi|rekomendasiin)\s+.{5,}/i,
  /\b(apa\s+aja|apa\s+saja|list|daftar)\s+.{5,}/i,
];

// Skip browse — pasti tidak perlu
const SKIP_BROWSE = [
  /^.{0,12}$/, // terlalu pendek
  /^(halo|hai|hi|hey|yo|oi|test|tes|ping|coba|iya|ya|nah|ok|oke|sip|makasih|thanks|mantap|keren|bye|dadah)\s*[!?.]?\s*$/i,
  /\bmenurut\s+(lu|lo|kamu)\b/i,
  /\b(masih\s+ragu|masih\s+bingung)\b/i,
  /^(lu|lo)\s+(masih|udah|beneran|yakin|serius)\b/i,
  /^(nah|lah|wah|eh)\s+(iya|bener|kan|gitu)\s*[?!.]?\s*$/i,
  /\b(lu|lo)\s+(halu|ngawur|buat\s+opini)\b/i,
  /\b(pendapat|opini)\s+(lu|lo)\b/i,
];

function shouldBrowse(input) {
  if (SKIP_BROWSE.some((r) => r.test(input.trim()))) return false;
  if (MUST_BROWSE.some((r) => r.test(input))) return true;
  return false;
}

// Noise words
const NOISE = [
  'cariin',
  'cari',
  'search',
  'browsing',
  'dong',
  'deh',
  'bro',
  'bang',
  'gan',
  'gue',
  'gw',
  'aku',
  'saya',
  'tolong',
  'please',
  'lu',
  'lo',
  'kamu',
  'anda',
  'coba',
  'minta',
  'tau',
  'tahu',
  'yang',
  'itu',
  'ini',
  'ada',
  'apa',
  'gimana',
  'gmn',
  'trus',
  'terus',
  'sebenernya',
  'beneran',
  'emangnya',
  'nih',
  'sih',
  'lah',
  'kah',
  'nah',
  'jadi',
  'kan',
  'udah',
  'sudah',
  'belum',
  'masih',
  'emang',
  'sekarang',
  'tadi',
  'tolong',
  'mohon',
  'berita',
  'info',
  'informasi',
  'soal',
  'tentang',
];

function extractKeywords(text) {
  let q = text.toLowerCase().replace(/[?!,]/g, ' ').replace(/\s+/g, ' ').trim();
  for (const w of NOISE) {
    q = q.replace(new RegExp(`\\b${w}\\b`, 'g'), ' ');
  }
  return q.replace(/\s+/g, ' ').trim();
}

// Domain map untuk follow-up context
const DOMAIN_MAP = [
  { re: /openclaw/i, kw: 'openclaw ai agent' },
  { re: /hermes\s+agent/i, kw: 'hermes agent ai framework' },
  { re: /hermes/i, kw: 'hermes ai agent' },
  { re: /droidclaw/i, kw: 'droidclaw ai agent' },
  { re: /nanobot/i, kw: 'nanobot ai agent termux' },
  { re: /picoclaw/i, kw: 'picoclaw ai agent' },
  { re: /kereta|krl|argo/i, kw: 'kecelakaan kereta bekasi timur 2026' },
  { re: /kemenhub|menhub/i, kw: 'kemenhub menteri perhubungan kebijakan' },
  {
    re: /gerbong.*perempuan/i,
    kw: 'gerbong perempuan kereta kebijakan menteri',
  },
  { re: /lagu.*67|67.*lagu/i, kw: 'lagu 67 viral tiktok arti lirik' },
  {
    re: /ai.?agent|framework/i,
    kw: 'ai agent framework android termux ringan',
  },
];

function extractTopicFromHistory(history) {
  if (!history) return '';
  const text = history.split('\n').slice(-12).join(' ');
  const found = [];
  for (const { re, kw } of DOMAIN_MAP) {
    if (re.test(text)) {
      found.push(kw);
      if (found.length >= 2) break;
    }
  }
  return found.join(' ');
}

function generateQuery(input, history = '') {
  if (!shouldBrowse(input)) return null;

  const isFollowUp =
    input.split(/\s+/).length < 8 &&
    /\b(itu|nya|tadi|gimana|gmn|trus|terus|lanjut|hasilnya|responnya|kebijakannya|mereka|dia)\b/i.test(
      input
    );

  if (isFollowUp && history) {
    const topic = extractTopicFromHistory(history);
    if (topic) {
      const kw = extractKeywords(input);
      const combined = kw.length > 4 ? `${topic} ${kw}` : topic;
      const q = combined.trim();
      return /20\d\d/.test(q) ? q : `${q} ${new Date().getFullYear()}`;
    }
  }

  const kw = extractKeywords(input);
  if (!kw || kw.length < 5) return null;
  return /20\d\d/.test(kw) ? kw : `${kw} ${new Date().getFullYear()}`;
}

async function smartSearch(input, history = '') {
  if (!shouldBrowse(input)) return { needed: false, data: null };

  const query = generateQuery(input, history);
  if (!query) return { needed: true, data: null, reason: 'query tidak valid' };

  console.log(`[search] Query: "${query}"`);

  let results;
  try {
    results = await searchWeb.search(query);
  } catch (err) {
    return { needed: true, data: null, error: err.message };
  }

  if (!results?.length) return { needed: true, data: null, query };

  const pages = [];
  for (const r of results.slice(0, 3)) {
    if (pages.length >= 2) break;
    try {
      const page = await fetchUrl.fetch(r.url);
      if (page.content.length > 150) {
        pages.push({
          title: r.title,
          url: r.url,
          content: page.content.slice(0, 2500),
        });
      }
    } catch {}
  }

  const snippets = results
    .slice(0, 5)
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}`)
    .join('\n\n');

  return {
    needed: true,
    query,
    data: {
      snippets,
      pages,
      hasPages: pages.length > 0,
      count: results.length,
    },
  };
}

module.exports = { smartSearch, shouldBrowse, generateQuery };
