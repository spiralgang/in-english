'use strict';

const https = require('https');

const MODEL = 'gpt-4o-mini'; // murah + cepat
const MAX_TOKENS = 2048;

async function call(prompt, options = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY belum di-set di .env');

  const body = JSON.stringify({
    model: options.model || MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: options.maxTokens || MAX_TOKENS,
    temperature: options.temperature ?? 0.7,
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.openai.com',
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
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
            if (json.error)
              return reject(new Error(`OpenAI error: ${json.error.message}`));
            const text = json.choices?.[0]?.message?.content;
            if (!text) return reject(new Error('OpenAI: response kosong'));
            resolve(text.trim());
          } catch {
            reject(new Error(`Parse error: ${data.slice(0, 200)}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(60000, () => req.destroy(new Error('OpenAI: timeout')));
    req.write(body);
    req.end();
  });
}

module.exports = { call };
