'use strict';

const https    = require('https');
const http     = require('http');
const { parse } = require('node-html-parser');

const MAX_LENGTH = 5000;

async function fetchRaw(url) {
  return new Promise((resolve, reject) => {
    const lib     = url.startsWith('https') ? https : http;
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ai-agent-cli/1.0)',
        'Accept'    : 'text/html,application/xhtml+xml',
      },
    };

    const req = lib.get(url, options, (res) => {
      // Handle redirect
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchRaw(res.headers.location).then(resolve).catch(reject);
      }

      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve(data));
    });

    req.on('error', reject);
    req.setTimeout(12000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

async function fetch(url) {
  try {
    const html = await fetchRaw(url);
    const root = parse(html);

    // Hapus elemen tidak perlu
    for (const tag of ['script', 'style', 'nav', 'footer', 'header', 'iframe', 'noscript']) {
      root.querySelectorAll(tag).forEach(el => el.remove());
    }

    // Ambil teks bersih
    const text = root.text
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .slice(0, MAX_LENGTH);

    return { ok: true, content: text, url };
  } catch (err) {
    return { ok: false, content: '', error: err.message, url };
  }
}

module.exports = { fetch };
