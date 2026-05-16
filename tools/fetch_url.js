/**
 * tools/fetch_url.js — Fetch & extract clean text dari URL
 */
'use strict';

const axios = require('axios');
const { parse } = require('node-html-parser');

const MAX_LENGTH = 5000;

async function fetch(url) {
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ai-agent-cli/1.0)',
        Accept: 'text/html',
      },
      timeout: 12000,
      maxRedirects: 3,
      // Jangan throw untuk status non-2xx
      validateStatus: (s) => s < 500,
    });

    const root = parse(res.data);

    // Hapus elemen tidak perlu
    for (const tag of [
      'script',
      'style',
      'nav',
      'footer',
      'header',
      'aside',
      'noscript',
    ]) {
      root.querySelectorAll(tag).forEach((el) => el.remove());
    }

    // Ambil text bersih
    let text =
      root.querySelector('main')?.text ||
      root.querySelector('article')?.text ||
      root.querySelector('body')?.text ||
      root.text;

    // Bersihkan whitespace berlebih
    text = text
      .replace(/\t/g, ' ')
      .replace(/[ ]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .slice(0, MAX_LENGTH);

    return { url, content: text };
  } catch (err) {
    console.error('[fetch_url] Error:', err.message);
    return { url, content: '' };
  }
}

module.exports = { fetch };
