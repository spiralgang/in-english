/**
 * provider/gemini.js — Google Gemini API
 */

'use strict';

const https = require('https');

const MODEL = 'gemini-2.5-flash';
const MAX_TOKENS = 2048;

async function call(prompt, options = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY belum di-set di .env');

  const model = options.model || MODEL;
  const tokens = options.maxTokens || MAX_TOKENS;

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: tokens,
      temperature: options.temperature ?? 0.7,
    },
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1beta/models/${model}:generateContent?key=${apiKey}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.error) {
              return reject(
                new Error(`Gemini API error: ${json.error.message}`)
              );
            }
            const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) return reject(new Error('Gemini: response kosong'));
            resolve(text.trim());
          } catch (err) {
            reject(new Error(`Parse error: ${data.slice(0, 200)}`));
          }
        });
      }
    );

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy(new Error('Gemini: request timeout (30s)'));
    });

    req.write(body);
    req.end();
  });
}

module.exports = { call };
