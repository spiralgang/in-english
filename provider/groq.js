'use strict';

const https = require('https');

const MODEL      = 'llama-3.3-70b-versatile';
const MAX_TOKENS = 2048;
const MAX_RETRY  = 3;
const RETRY_DELAY = 2000;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function callOnce(prompt, options = {}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY belum di-set di .env');

  const messages = options.systemPrompt
    ? [{ role: 'system', content: options.systemPrompt }, { role: 'user', content: prompt }]
    : [{ role: 'user', content: prompt }];

  const body = JSON.stringify({
    model      : options.model || MODEL,
    messages,
    max_tokens : options.maxTokens || MAX_TOKENS,
    temperature: options.temperature ?? 0.7,
    stream     : false,
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.groq.com',
      path    : '/openai/v1/chat/completions',
      method  : 'POST',
      headers : {
        'Content-Type'  : 'application/json',
        'Authorization' : `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) return reject(new Error(`Groq error: ${json.error.message}`));
          const text = json.choices?.[0]?.message?.content;
          if (!text) return reject(new Error('Groq: response kosong'));
          resolve(text.trim());
        } catch {
          reject(new Error(`Parse error: ${data.slice(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(60000, () => req.destroy(new Error('Groq: timeout (60s)')));
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
      const isRetryable = /timeout|ETIMEDOUT|ECONNRESET|rate.limit/i.test(err.message);
      if (!isRetryable || i === MAX_RETRY) break;
      console.log(`[groq] Attempt ${i}/${MAX_RETRY} gagal: ${err.message}, retry...`);
      await sleep(RETRY_DELAY * i);
    }
  }
  throw lastErr;
}

async function stream(prompt, options = {}, onToken) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY belum di-set di .env');

  const messages = options.systemPrompt
    ? [{ role: 'system', content: options.systemPrompt }, { role: 'user', content: prompt }]
    : [{ role: 'user', content: prompt }];

  const body = JSON.stringify({
    model      : options.model || MODEL,
    messages,
    max_tokens : options.maxTokens || 1024,
    temperature: options.temperature ?? 0.7,
    stream     : true,
  });

  return new Promise((resolve, reject) => {
    let fullText = '', buffer = '';
    const req = https.request({
      hostname: 'api.groq.com',
      path    : '/openai/v1/chat/completions',
      method  : 'POST',
      headers : {
        'Content-Type'  : 'application/json',
        'Authorization' : `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      res.on('data', chunk => {
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
            if (token) { fullText += token; if (onToken) onToken(token); }
          } catch {}
        }
      });
      res.on('end', () => resolve(fullText.trim()));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(120000, () => req.destroy(new Error('Groq stream timeout')));
    req.write(body);
    req.end();
  });
}

module.exports = { call, stream };
