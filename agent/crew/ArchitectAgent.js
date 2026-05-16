'use strict';

const AgentBase = require('../AgentBase');

class ArchitectAgent extends AgentBase {
  constructor() {
    super({
      id: 'architect',
      role: 'Architect',
      model: 'meta/llama-3.3-70b-instruct',
      personality: `Kamu adalah Software Architect senior berpengalaman 15 tahun.
Rancang arsitektur teknis yang scalable dan maintainable.
Bicara profesional tapi tegas. Gunakan bahasa Indonesia natural.`,
    });
  }

  async work(task) {
    this.say(`Analisis kebutuhan teknis: "${task.desc}"`);
    this.memory.setCurrentTask(task);

    let result;
    try {
      result = await this.think(
        `Rancang arsitektur teknis untuk:

TASK: ${task.desc}
CONTEXT: ${task.context || 'tidak ada'}

Berikan: tech stack, struktur folder, module dan tanggung jawabnya, alur data, potensi risiko.
Rekomendasi KONKRET dan SPESIFIK. Jangan tulis kode.`,
        { maxTokens: 2000, temperature: 0.3 }
      );
    } catch (err) {
      this.say(`Architect timeout: ${err.message}, pakai arsitektur default`);
      result =
        'TECH_STACK:\n- Runtime: Node.js\n- Language: JavaScript\n- Libraries: dotenv, axios\n\nFILE_STRUCTURE:\n- index.js (main)\n- .env.example\n- README.md\n\nMODULES:\n- index.js: logic utama\n\nDATA_FLOW:\nInput → Process → Output\n\nRISKS:\n- Validasi input diperlukan';
    }

    this.say('Arsitektur selesai');
    this.memory.completeTask(result);
    return { ok: true, role: 'architect', output: result };
  }
}

module.exports = ArchitectAgent;
