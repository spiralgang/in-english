'use strict';

const https = require('https');
const { loadPlugins } = require('../../tools/plugin_loader');

function buildTools() {
  const tools = [
    {
      type: 'function',
      function: {
        name: 'search_web',
        description: 'Cari informasi di internet',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Query pencarian' },
          },
          required: ['query'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'fetch_url',
        description: 'Ambil konten dari URL tertentu',
        parameters: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'URL yang ingin diambil' },
          },
          required: ['url'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'finish',
        description: 'Selesai — kirim jawaban final ke user',
        parameters: {
          type: 'object',
          properties: {
            answer: { type: 'string', description: 'Jawaban final' },
          },
          required: ['answer'],
        },
      },
    },
  ];

  // Tambah plugin sebagai tools
  try {
    const plugins = loadPlugins();
    for (const [name, plugin] of Object.entries(plugins)) {
      tools.push({
        type: 'function',
        function: {
          name,
          description: plugin.description,
          parameters: {
            type: 'object',
            properties: {
              input: { type: 'string', description: 'Input untuk plugin' },
            },
            required: ['input'],
          },
        },
      });
    }
  } catch {}

  return tools;
}

async function think(ctx) {
  const { input, observations = [] } = ctx;
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) throw new Error('NVIDIA_API_KEY tidak ada');

  const now = new Date().toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Bangun messages dari observations
  const messages = [
    {
      role: 'system',
      content: `Kamu AI agent. Hari ini: ${now}.
ATURAN:
- Setelah search_web, WAJIB fetch_url ke URL yang relevan sebelum finish
- Jangan fetch YouTube — kontennya selalu kosong
- Jangan ulangi action yang sama
- Kalau sudah 3+ observasi atau sudah dapat info → gunakan finish
- Jangan mengarang fakta yang tidak ada di observasi`,
    },
    { role: 'user', content: `Task: ${input}` },
  ];

  // Inject observasi sebagai conversation history
  for (const obs of observations) {
    messages.push({
      role: 'assistant',
      content: null,
      tool_calls: [
        {
          id: `call_${Date.now()}`,
          type: 'function',
          function: {
            name: obs.action,
            arguments: JSON.stringify({
              query: obs.input,
              url: obs.input,
              answer: obs.input,
              input: obs.input,
            }),
          },
        },
      ],
    });
    messages.push({
      role: 'tool',
      tool_call_id: `call_${Date.now()}`,
      content: String(obs.result).slice(0, 800),
    });
  }

  const body = JSON.stringify({
    model: 'meta/llama-3.3-70b-instruct',
    messages,
    tools: buildTools(),
    tool_choice: 'auto',
    max_tokens: 300,
    temperature: 0.1,
  });

  return new Promise((resolve) => {
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
        let d = '';
        res.on('data', (c) => {
          d += c;
        });
        res.on('end', () => {
          try {
            const json = JSON.parse(d);
            const message = json.choices?.[0]?.message;
            const toolCall = message?.tool_calls?.[0];

            if (!toolCall) {
              // LLM jawab langsung tanpa tool
              const text = message?.content;
              if (text)
                return resolve({
                  ok: true,
                  thought: 'Direct answer',
                  action: 'finish',
                  input: text,
                });
              return resolve({
                ok: false,
                error: 'Tidak ada tool call atau content',
              });
            }

            const name = toolCall.function.name;
            const args = JSON.parse(toolCall.function.arguments || '{}');
            const input_val =
              args.query || args.url || args.answer || args.input || '';

            console.log(`[react] Thought: ${message.content || '(thinking)'}`);
            resolve({
              ok: true,
              thought: message.content || '',
              action: name,
              input: input_val,
            });
          } catch (err) {
            resolve({ ok: false, error: `Parse error: ${err.message}` });
          }
        });
      }
    );
    req.on('error', (e) => resolve({ ok: false, error: e.message }));
    req.setTimeout(60000, () => {
      req.destroy();
      resolve({ ok: false, error: 'Timeout' });
    });
    req.write(body);
    req.end();
  });
}

module.exports = { think };
