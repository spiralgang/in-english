'use strict';

const PROVIDER  = process.env.AI_PROVIDER || 'nvidia';
const SUPPORTED = ['gemini', 'nvidia', 'groq', 'openrouter', 'ollama', 'openai'];

const ROLE_MODELS = {
  nvidia: {
    builder   : 'meta/llama-3.3-70b-instruct',
    checker   : 'meta/llama-3.3-70b-instruct',
    researcher: 'meta/llama-3.3-70b-instruct',
    thinker   : 'meta/llama-3.3-70b-instruct',
    planner   : 'meta/llama-3.3-70b-instruct',
    chatter   : 'meta/llama-3.3-70b-instruct',
    decider   : 'meta/llama-3.3-70b-instruct',
    default   : 'meta/llama-3.3-70b-instruct',
  },
  groq: {
    builder   : 'llama-3.3-70b-versatile',
    checker   : 'llama-3.3-70b-versatile',
    researcher: 'llama-3.3-70b-versatile',
    thinker   : 'llama-3.3-70b-versatile',
    planner   : 'llama-3.3-70b-versatile',
    chatter   : 'llama-3.3-70b-versatile',
    decider   : 'llama-3.3-70b-versatile',
    default   : 'llama-3.3-70b-versatile',
  },
  openrouter: {
    builder   : 'deepseek/deepseek-r1:free',
    checker   : 'deepseek/deepseek-r1:free',
    researcher: 'meta-llama/llama-3.3-70b-instruct:free',
    thinker   : 'meta-llama/llama-3.3-70b-instruct:free',
    planner   : 'meta-llama/llama-3.3-70b-instruct:free',
    chatter   : 'meta-llama/llama-3.3-70b-instruct:free',
    decider   : 'meta-llama/llama-3.3-70b-instruct:free',
    default   : 'meta-llama/llama-3.3-70b-instruct:free',
  },
  gemini: {
    default   : 'gemini-2.5-flash',
  },
  openai: {
    default   : 'gpt-4o-mini',
  },
  ollama: {
    default   : process.env.OLLAMA_MODEL || 'llama3.2',
  },
};

function getModel(role) {
  const providerModels = ROLE_MODELS[PROVIDER] || ROLE_MODELS.nvidia;
  return providerModels[role] || providerModels.default;
}

// Urutan fallback kalau provider utama gagal
const FALLBACK_ORDER = {
  nvidia    : ['groq', 'openrouter', 'gemini', 'openai'],
  groq      : ['nvidia', 'openrouter', 'gemini', 'openai'],
  openrouter: ['groq', 'nvidia', 'gemini', 'openai'],
  gemini    : ['groq', 'nvidia', 'openrouter', 'openai'],
  openai    : ['groq', 'nvidia', 'openrouter', 'gemini'],
  ollama    : ['groq', 'nvidia', 'openrouter'],
};

function hasKey(provider) {
  const keyMap = {
    nvidia     : 'NVIDIA_API_KEY',
    gemini     : 'GEMINI_API_KEY',
    openai     : 'OPENAI_API_KEY',
    groq       : 'GROQ_API_KEY',
    openrouter : 'OPENROUTER_API_KEY',
    ollama     : null, // tidak perlu key
  };
  const key = keyMap[provider];
  if (!key) return true;
  return !!process.env[key];
}

async function call(prompt, options = {}) {
  if (!SUPPORTED.includes(PROVIDER)) {
    throw new Error(`Provider "${PROVIDER}" tidak dikenal. Pilih: ${SUPPORTED.join(', ')}`);
  }

  const tryProvider = async (providerName, attempt) => {
    const p = require(`./${providerName}`);
    const model = options.model && attempt === 1
      ? options.model
      : (ROLE_MODELS[providerName]?.[options.role] || ROLE_MODELS[providerName]?.default);

    const opts = { ...options, model };
    console.log(`[router] Attempt ${attempt}/6 via ${providerName}, model: ${model}`);
    return await p.call(prompt, opts);
  };

  // Coba provider utama
  try {
    return await tryProvider(PROVIDER, 1);
  } catch (err) {
    const isRetryable = /timeout|quota|rate.limit|kosong|ECONNRESET/i.test(err.message);
    if (!isRetryable) throw err;
    console.log(`[router] ${PROVIDER} gagal: ${err.message.slice(0, 60)}, coba fallback...`);
  }

  // Fallback ke provider lain yang punya key
  const fallbacks = (FALLBACK_ORDER[PROVIDER] || []).filter(hasKey);
  let attempt = 2;
  for (const fb of fallbacks) {
    try {
      const result = await tryProvider(fb, attempt);
      return result;
    } catch (err) {
      console.log(`[router] ${fb} gagal: ${err.message.slice(0, 60)}`);
      attempt++;
    }
  }

  throw new Error('Semua provider gagal. Cek API key dan koneksi internet.');
}

async function stream(prompt, options = {}, onToken) {
  const p = require(`./${PROVIDER}`);
  if (!options.model && options.role) options.model = getModel(options.role);
  if (!p.stream) {
    const result = await p.call(prompt, options);
    if (onToken) for (const word of result.split(' ')) { onToken(word + ' '); await new Promise(r => setTimeout(r, 20)); }
    return result;
  }
  return p.stream(prompt, options, onToken);
}

module.exports = { call, stream, getModel, ROLE_MODELS, SUPPORTED };
