'use strict';

const AgentBase = require('../AgentBase');
const searchWeb = require('../../tools/search_web');
const fetchUrl = require('../../tools/fetch_url');

class ResearcherAgent extends AgentBase {
  constructor() {
    super({
      id: 'researcher',
      role: 'Researcher',
      model: 'meta/llama-3.3-70b-instruct',
      personality: `Kamu adalah Research Specialist yang teliti dan faktual.
Kamu tidak pernah mengarang fakta. Selalu kasih referensi konkret.
Gunakan bahasa Indonesia natural.`,
    });
  }

  async work(task) {
    this.say(`Cari referensi: "${task.desc}"`);
    this.memory.setCurrentTask(task);

    let webData = '';
    try {
      this.say('Searching web...');
      const results = await searchWeb.search(task.desc, 3);
      for (const r of results.slice(0, 2)) {
        try {
          const page = await fetchUrl.fetch(r.url);
          if (page.content.length > 100)
            webData += `=== ${r.title} ===\n${page.content.slice(0, 1000)}\n\n`;
        } catch {}
      }
      if (!webData) webData = searchWeb.format(results);
    } catch (err) {
      this.say(`Web search gagal: ${err.message}, lanjut tanpa data web`);
    }

    let result;
    try {
      result = await this.think(
        `Research untuk:

TASK: ${task.desc}
ARSITEKTUR: ${(task.architecture || '').slice(0, 200)}
DATA WEB:\n${webData || '(tidak ada)'}

Berikan: best practices, library yang direkomendasikan, pattern yang terbukti, anti-patterns.
Fokus ke hal yang berguna untuk Builder.`,
        { maxTokens: 1500, temperature: 0.3 }
      );
    } catch (err) {
      this.say(`Research timeout: ${err.message}, pakai knowledge dasar`);
      result =
        'BEST PRACTICES:\n- Gunakan async/await dengan try/catch\n- Validasi semua input\n- Simpan config di .env\n- Tulis README yang jelas\n\nLIBRARY:\n- dotenv untuk config\n- axios untuk HTTP request\n\nPATTERN:\n- Error handling di semua async operations\n- Graceful shutdown dengan SIGTERM handler';
    }

    this.say('Research selesai');
    this.memory.completeTask(result);
    return { ok: true, role: 'researcher', output: result };
  }
}

module.exports = ResearcherAgent;
