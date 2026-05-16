/**
 * tools/search_web.js — DuckDuckGo HTML search (no API key)
 */
'use strict';

const axios = require('axios');
const { parse } = require('node-html-parser');

async function search(query, limit = 6) {
  try {
    const res = await axios.get('https://html.duckduckgo.com/html/', {
      params: { q: query },
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ai-agent-cli/1.0)',
        Accept: 'text/html',
      },
      timeout: 10000,
    });

    const root = parse(res.data);
    const results = [];

    for (const el of root.querySelectorAll('.result')) {
      const titleEl = el.querySelector('.result__title a');
      const snippetEl = el.querySelector('.result__snippet');
      const linkEl = el.querySelector('.result__url');

      if (!titleEl) continue;

      // Bersihkan URL — hindari redirect DuckDuckGo
      let url = titleEl.getAttribute('href') || '';
      if (url.includes('duckduckgo.com/l/?')) {
        try {
          const u = new URL('https://x.com' + url);
          url = decodeURIComponent(u.searchParams.get('uddg') || url);
        } catch {
          /* skip */
        }
      }

      if (!url.startsWith('http')) continue;

      results.push({
        title: titleEl.text.trim(),
        url,
        snippet: snippetEl?.text.trim() || '',
      });

      if (results.length >= limit) break;
    }

    return results;
  } catch (err) {
    console.error('[search_web] Error:', err.message);
    return [];
  }
}

// Format untuk inject ke prompt
function format(results) {
  if (!results.length) return '(tidak ada hasil)';
  return results
    .map((r, i) => `[${i + 1}] ${r.title}\n    URL: ${r.url}\n    ${r.snippet}`)
    .join('\n\n');
}

module.exports = { search, format };
