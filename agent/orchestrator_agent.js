'use strict';

const provider = require('../provider/router');

// Sub-agent definitions
const SUB_AGENTS = {
  coder: {
    model: 'qwen/qwen2.5-coder-32b-instruct',
    description: 'Spesialis coding, debugging, dan code review',
    systemPrompt:
      'Kamu adalah senior software engineer. Tulis kode yang bersih, efisien, dan langsung bisa dijalankan.',
  },
  researcher: {
    model: 'meta/llama-3.3-70b-instruct',
    description: 'Spesialis riset, analisis, dan pengumpulan informasi',
    systemPrompt:
      'Kamu adalah research analyst. Analisis informasi dengan akurat dan ringkas.',
  },
  creative: {
    model: 'meta/llama-3.3-70b-instruct',
    description: 'Spesialis penulisan kreatif, brainstorming, dan ide',
    systemPrompt:
      'Kamu adalah creative director. Berikan ide-ide segar dan konten yang menarik.',
  },
  analyst: {
    model: 'meta/llama-3.3-70b-instruct',
    description: 'Spesialis analisis data, angka, dan laporan',
    systemPrompt:
      'Kamu adalah data analyst. Analisis data dengan teliti dan berikan insight yang actionable.',
  },
};

// Orchestrator memutuskan sub-agent mana yang dipanggil
async function orchestrate(input) {
  const systemPrompt = `Kamu adalah orchestrator AI yang mengelola tim sub-agent.
Tim yang tersedia:
${Object.entries(SUB_AGENTS)
    .map(([k, v]) => `- ${k}: ${v.description}`)
    .join('\n')}

Analisis task dan tentukan:
1. Apakah butuh 1 atau lebih sub-agent?
2. Urutan eksekusi yang optimal
3. Cara menggabungkan hasilnya

Jawab HANYA JSON:
{
  "plan": "penjelasan singkat strategi",
  "agents": ["nama_agent1", "nama_agent2"],
  "prompts": {"nama_agent": "prompt spesifik untuk agent ini"}
}`;

  let plan;
  try {
    const raw = await provider.call(input, {
      role: 'decider',
      systemPrompt,
      maxTokens: 400,
      temperature: 0.1,
    });
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON');
    plan = JSON.parse(match[0]);
  } catch {
    // Fallback: pakai researcher untuk semua
    plan = {
      plan: 'Fallback ke single agent',
      agents: ['researcher'],
      prompts: { researcher: input },
    };
  }

  console.log(`[multi-agent] Plan: ${plan.plan}`);
  console.log(`[multi-agent] Agents: ${plan.agents.join(' → ')}`);

  // Jalankan sub-agents secara berurutan
  const results = {};
  let prevResult = '';

  for (const agentName of plan.agents) {
    const agent = SUB_AGENTS[agentName];
    if (!agent) continue;

    const agentPrompt = plan.prompts[agentName] || input;
    const fullPrompt = prevResult
      ? `Context dari agent sebelumnya:\n${prevResult}\n\nTask: ${agentPrompt}`
      : agentPrompt;

    console.log(`[multi-agent] Running ${agentName}...`);
    try {
      const result = await provider.call(fullPrompt, {
        model: agent.model,
        systemPrompt: agent.systemPrompt,
        maxTokens: 1000,
      });
      results[agentName] = result;
      prevResult = result.slice(0, 500);
    } catch (err) {
      results[agentName] = `Error: ${err.message}`;
    }
  }

  // Kalau cuma 1 agent, return langsung
  if (plan.agents.length === 1) {
    return results[plan.agents[0]];
  }

  // Kalau multi-agent, minta orchestrator gabungin hasilnya
  const combinePrompt = `Gabungkan hasil kerja tim agent berikut menjadi jawaban final yang kohesif:

${Object.entries(results)
    .map(([k, v]) => `=== ${k.toUpperCase()} ===\n${v}`)
    .join('\n\n')}

Task asli: ${input}

Buat ringkasan final yang komprehensif:`;

  try {
    return await provider.call(combinePrompt, {
      role: 'chatter',
      maxTokens: 500,
    });
  } catch {
    return Object.values(results).join('\n\n');
  }
}

module.exports = { orchestrate, SUB_AGENTS };
