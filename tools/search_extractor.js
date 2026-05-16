'use strict';

const fetch = require('node-fetch');
const { parse } = require('node-html-parser');

// ============ EXTRACTOR PER DOMAIN ============

async function extractCoinmarketcap(query) {
  // Untuk crypto: ambil harga dari API
  const cryptoMap = {
    bitcoin: 'btc',
    btc: 'btc',
    ethereum: 'eth',
    eth: 'eth',
    solana: 'sol',
    sol: 'sol',
    dogecoin: 'doge',
    doge: 'doge',
  };

  for (const [name, symbol] of Object.entries(cryptoMap)) {
    if (query.toLowerCase().includes(name)) {
      try {
        const res = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${name}&vs_currencies=usd,idr`
        );
        const data = await res.json();
        if (data[name]) {
          return {
            type: 'crypto',
            name: name.toUpperCase(),
            price_usd: data[name].usd,
            price_idr: data[name].idr,
            source: 'CoinGecko API',
          };
        }
      } catch (e) {}
    }
  }
  return null;
}

async function extractIndodax(query) {
  if (
    !query.toLowerCase().includes('bitcoin') &&
    !query.toLowerCase().includes('btc')
  )
    return null;
  try {
    const res = await fetch('https://indodax.com/api/btc_idr/ticker');
    const data = await res.json();
    if (data.ticker && data.ticker.last) {
      return {
        type: 'crypto',
        name: 'BTC',
        price_idr: parseInt(data.ticker.last).toLocaleString('id-ID'),
        source: 'Indodax API',
      };
    }
  } catch (e) {}
  return null;
}

async function extractWikipedia(query) {
  // Ambil kata kunci dari query
  const keywords = query
    .replace(/apa itu|siapa itu|jelaskan|tentang/gi, '')
    .trim();
  if (keywords.length < 3) return null;

  try {
    const encoded = encodeURIComponent(keywords);
    const res = await fetch(
      `https://id.wikipedia.org/api/rest_v1/page/summary/${encoded}`
    );
    if (res.ok) {
      const data = await res.json();
      if (data.extract && !data.title?.includes('Not found')) {
        return {
          type: 'wiki',
          title: data.title,
          summary: data.extract.slice(0, 500),
          source: 'Wikipedia',
        };
      }
    }
  } catch (e) {}
  return null;
}

async function extractNews(query) {
  // Cek apakah query minta berita
  if (!/(berita|news|terbaru|hari ini|kemarin|viral|trending)/i.test(query))
    return null;

  try {
    // Pake DuckDuckGo berita (gratis, no API key)
    const encoded = encodeURIComponent(query + ' berita terbaru');
    const res = await fetch(
      `https://api.duckduckgo.com/?q=${encoded}&format=json`
    );
    const data = await res.json();

    if (data.AbstractText && data.AbstractText.length > 50) {
      return {
        type: 'news',
        summary: data.AbstractText.slice(0, 500),
        source: 'DuckDuckGo',
        url: data.AbstractURL || null,
      };
    }
  } catch (e) {}
  return null;
}

async function extractWeather(query) {
  if (!/(cuaca|weather|suhu|hujan|cerah)/i.test(query)) return null;

  // Extract kota
  let city = 'Jakarta';
  const cityMatch = query.match(/(di|kota|weather in|cuaca di)\s+(\w+)/i);
  if (cityMatch) city = cityMatch[2];

  try {
    const res = await fetch(`https://wttr.in/${city}?format=%C+%t+%w&lang=id`);
    const weather = await res.text();
    if (weather && !weather.includes('Unknown')) {
      return {
        type: 'weather',
        city: city,
        condition: weather.trim(),
        source: 'wttr.in',
      };
    }
  } catch (e) {}
  return null;
}

// ============ MAIN EXTRACTOR ============

async function extract(query) {
  // Urutan prioritas extractor
  const extractors = [
    { name: 'indodax', fn: () => extractIndodax(query) },
    { name: 'coingecko', fn: () => extractCoinmarketcap(query) },
    { name: 'weather', fn: () => extractWeather(query) },
    { name: 'wiki', fn: () => extractWikipedia(query) },
    { name: 'news', fn: () => extractNews(query) },
  ];

  for (const ex of extractors) {
    try {
      const result = await ex.fn();
      if (result) return result;
    } catch (e) {
      console.log(`[extractor] ${ex.name} failed:`, e.message);
    }
  }

  return null;
}

function formatResult(result) {
  if (!result) return null;

  switch (result.type) {
  case 'crypto':
    if (result.price_idr) {
      return `💰 ${result.name}: Rp${result.price_idr} (dari ${result.source})`;
    }
    return `💰 ${result.name}: $${result.price_usd} (${result.source})`;

  case 'wiki':
    return `📖 ${result.title}\n${result.summary}\n\nSumber: ${result.source}`;

  case 'news':
    return `📰 ${result.summary}\n\nSumber: ${result.source}${result.url ? '\nLink: ' + result.url : ''}`;

  case 'weather':
    return `🌤️ Cuaca ${result.city}: ${result.condition}\nSumber: ${result.source}`;

  default:
    return null;
  }
}

module.exports = { extract, formatResult };
