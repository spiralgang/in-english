'use strict';

const http = require('http');

const HOST       = process.env.OLLAMA_HOST || 'localhost';
const PORT       = parseInt(process.env.OLLAMA_PORT || '11434');
const MODEL      = process.env.OLLAMA_MODEL || 'llama3.2';
const MAX_RETRY  = 2;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function callOnce(prompt, options = {}) {
  const messages = options.systemPrompt
    ? [{ role: 'system', content: options.systemPrompt }, { role: 'user', content: prompt }]
    : [{ role: 'user', content: prompt }];

  const body = JSON.stringify({
    model   : options.model || MODEL,
    messages,
    stream  : false,
    options : {
      temperature : options.temperature ?? 0.7,
      num_predict : options.maxTokens || 2048,
    },
  });

  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: HOST,
      port    : PORT,
      path    : '/api/chat',
      method  : 'POST',
      headers : {
        'Content-Type'  : 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) return reject(new Error(`Ollama error: ${json.error}`));
          const text = json.message?.content;
          if (!text) return reject(new Error('Ollama: response kosong'));
          resolve(text.trim());
        } catch {
          reject(new Error(`Parse error: ${data.slice(0, 200)}`));
        }
      });
    });
    req.on('error', (err) => reject(new Error(`Ollama tidak bisa diakses (${HOST}:${PORT}): ${err.message}`)));
    req.setTimeout(120000, () => req.destroy(new Error('Ollama: timeout (120s)')));
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
      if (i === MAX_RETRY) break;
      console.log(`[ollama] Attempt ${i}/${MAX_RETRY} gagal: ${err.message}, retry...`);
      await sleep(3000 * i);
    }
  }
  throw lastErr;
}

async function stream(prompt, options = {}, onToken) {
  const messages = options.systemPrompt
    ? [{ role: 'system', content: options.systemPrompt }, { role: 'user', content: prompt }]
    : [{ role: 'user', content: prompt }];

  const body = JSON.stringify({
    model   : options.model || MODEL,
    messages,
    stream  : true,
    options : { temperature: options.temperature ?? 0.7, num_predict: options.maxTokens || 1024 },
  });

  return new Promise((resolve, reject) => {
    let fullText = '';
    const req = http.request({
      hostname: HOST, port: PORT, path: '/api/chat', method: 'POST',
      headers : { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let buffer = '';
      res.on('data', chunk => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const json = JSON.parse(line);
            const token = json.message?.content || '';
            if (token) { fullText += token; if (onToken) onToken(token); }
          } catch {}
        }
      });
      res.on('end', () => resolve(fullText.trim()));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(180000, () => req.destroy(new Error('Ollama stream timeout')));
    req.write(body);
    req.end();
  });
}

module.exports = { call, stream };
