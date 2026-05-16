'use strict';

const https = require('https');

const MODEL = 'meta/llama-3.3-70b-instruct';
const MAX_TOKENS = 2048;
const MAX_RETRY = 3; // 3x cukup, jangan lama-lama
const RETRY_DELAY = 2000; // 2 detik aja
const TIMEOUT_MS = 30000; // 3 menit cukup // 3 menit

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function callOnce(prompt, options = {}) {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) throw new Error('NVIDIA_API_KEY belum di-set di .env');

  const messages = options.systemPrompt
    ? [
      { role: 'system', content: options.systemPrompt },
      { role: 'user', content: prompt },
    ]
    : [{ role: 'user', content: prompt }];

  const body = JSON.stringify({
    model: options.model || MODEL,
    messages,
    max_tokens: options.maxTokens || MAX_TOKENS,
    temperature: options.temperature ?? 0.7,
    stream: false,
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'integrate.api.nvidia.com',
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
              return reject(
                new Error(
                  `NVIDIA error: ${json.error.message || JSON.stringify(json.error)}`
                )
              );
            const text = json.choices?.[0]?.message?.content;
            if (!text) return reject(new Error('NVIDIA: response kosong'));
            resolve(text.trim());
          } catch {
            reject(
              new Error(
                `Parse error (HTTP ${res.statusCode}): ${data.slice(0, 300)}`
              )
            );
          }
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(TIMEOUT_MS, () =>
      req.destroy(new Error(`NVIDIA: timeout (${TIMEOUT_MS / 1000}s)`))
    );
    req.write(body);
    req.end();
  });
}

async function call(prompt, options = {}) {
  let lastErr;
  for (let i = 1; i <= MAX_RETRY; i++) {
    try {
      return await callOnce(prompt, options);
    } catch (err) {
      lastErr = err;
      const isRetryable =
        /timeout|ETIMEDOUT|ECONNRESET|ECONNREFUSED|socket hang up|response kosong/i.test(
          err.message
        );
      if (!isRetryable || i === MAX_RETRY) break;
      console.log(
        `[nvidia] Attempt ${i}/${MAX_RETRY} gagal: ${err.message}, retry dalam ${(RETRY_DELAY * i) / 1000}s...`
      );
      await sleep(RETRY_DELAY * i);
    }
  }
  console.error(
    '[nvidia] Gagal setelah ' + MAX_RETRY + 'x retry:',
    lastErr.message
  );
  throw new Error('NVIDIA timeout, coba lagi nanti');
}

async function stream(prompt, options = {}, onToken) {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) throw new Error('NVIDIA_API_KEY belum di-set di .env');

  const messages = options.systemPrompt
    ? [
      { role: 'system', content: options.systemPrompt },
      { role: 'user', content: prompt },
    ]
    : [{ role: 'user', content: prompt }];

  const body = JSON.stringify({
    model: options.model || MODEL,
    messages,
    max_tokens: options.maxTokens || 1024,
    temperature: options.temperature ?? 0.7,
    stream: true,
  });

  return new Promise((resolve, reject) => {
    let fullText = '',
      buffer = '';
    const req = https.request(
      {
        hostname: 'integrate.api.nvidia.com',
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        res.on('data', (chunk) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop();
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data:')) continue;
            const data = trimmed.slice(5).trim();
            if (data === '[DONE]') continue;
            try {
              const token = JSON.parse(data).choices?.[0]?.delta?.content || '';
              if (token) {
                fullText += token;
                if (onToken) onToken(token);
              }
            } catch {}
          }
        });
        res.on('end', () => resolve(fullText.trim()));
        res.on('error', reject);
      }
    );
    req.on('error', reject);
    req.setTimeout(300000, () =>
      req.destroy(new Error('NVIDIA stream timeout'))
    );
    req.write(body);
    req.end();
  });
}

module.exports = { call, stream };
