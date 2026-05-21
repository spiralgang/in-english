'use strict';

require('dotenv').config();

const https    = require('https');
const http     = require('http');
const cheerio  = require('cheerio');
const provider = require('../provider/router');

const CACHE     = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 menit

const HEADERS = {
  'User-Agent'     : 'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
  'Accept'         : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
  'Accept-Encoding': 'identity',
};

// ─── Fetch raw HTML ───────────────────────────────────────────────
async function fetchRaw(url, redirectCount = 0) {
  if (redirectCount > 5) throw new Error('Too many redirects');

  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { headers: HEADERS }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const next = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        return fetchRaw(next, redirectCount + 1).then(resolve).catch(reject);
      }

      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { data += chunk; if (data.length > 500000) req.destroy(); });
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(12000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

// ─── Parse HTML dengan Cheerio ────────────────────────────────────
function parseHTML(html, url) {
  try {
    const $ = cheerio.load(html);

    // Hapus elemen tidak perlu
    $('script, style, nav, footer, header, iframe, noscript, ads, .ads, #ads, .cookie, .popup, .modal').remove();

    // Ambil judul
    const title = $('title').text().trim() || $('h1').first().text().trim() || '';

    // Ambil meta description
    const desc = $('meta[name="description"]').attr('content') || '';

    // Ambil konten utama
    let content = '';
    const mainSelectors = ['article', 'main', '.content', '.article', '.post', '#content', '#main'];
    for (const sel of mainSelectors) {
      if ($(sel).length) {
        content = $(sel).text();
        break;
      }
    }
    if (!content) content = $('body').text();

    // Bersihkan whitespace
    content = content.replace(/\s+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, 3000);

    return { title, desc, content, url, ok: true };
  } catch (err) {
    return { title: '', desc: '', content: '', url, ok: false, error: err.message };
  }
}

// ─── Fetch satu URL dengan cache ──────────────────────────────────
async function fetchPage(url) {
  // Cek cache
  const cached = CACHE.get(url);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  try {
    const html   = await fetchRaw(url);
    const parsed = parseHTML(html, url);
    CACHE.set(url, { data: parsed, ts: Date.now() });
    return parsed;
  } catch (err) {
    return { title: '', desc: '', content: '', url, ok: false, error: err.message };
  }
}

// ─── Fetch multiple URL parallel ─────────────────────────────────
async function fetchAll(urls) {
  return Promise.all(urls.map(url => fetchPage(url)));
}

// ─── Main browse function ─────────────────────────────────────────
async function browse(query, searchResults) {
  if (!searchResults || searchResults.length === 0) {
    return { ok: false, output: 'Tidak ada hasil pencarian.' };
  }

  // Ambil top 3 URL
  const urls  = searchResults.slice(0, 3).map(r => r.url);
  const pages = await fetchAll(urls);

  // Build context untuk LLM
  let context = '';
  for (let i = 0; i < pages.length; i++) {
    const p   = pages[i];
    const src = searchResults[i];
    if (!p.ok || !p.content) {
      context += `\n[Sumber ${i+1}] ${src.title}\nURL: ${src.url}\nInfo: ${src.snippet || 'Tidak bisa diakses'}\n`;
      continue;
    }
    context += `\n[Sumber ${i+1}] ${p.title || src.title}\nURL: ${p.url}\nKonten: ${p.content}\n`;
  }

  // LLM synthesize dengan cross-verification
  const prompt = `Kamu adalah research assistant yang akurat dan jujur.

PERTANYAAN USER: "${query}"

HASIL DARI ${pages.length} SUMBER:
${context}

INSTRUKSI:
- Jawab pertanyaan berdasarkan HANYA informasi dari sumber di atas
- Kalau ada angka/harga/data spesifik, sebutkan persis dari sumber
- Sebutkan sumbernya (nama situs atau URL)
- Kalau antar sumber berbeda, sebutkan perbedaannya
- Gunakan bahasa Indonesia santai (gue/lo)
- JANGAN mengarang fakta yang tidak ada di sumber
- Kalau informasi tidak tersedia di sumber, bilang terus terang

Jawaban:`;

  try {
    const output = await provider.call(prompt, { maxTokens: 800, temperature: 0.3 });
    return { ok: true, output };
  } catch (err) {
    // Fallback — rangkum manual tanpa LLM
    const summary = pages
      .filter(p => p.ok && p.content)
      .map((p, i) => `[${searchResults[i]?.title}]: ${p.content.slice(0, 300)}`)
      .join('\n\n');
    return { ok: true, output: summary || 'Tidak bisa merangkum hasil.' };
  }
}

module.exports = { browse, fetchPage, fetchAll, fetchRaw };
