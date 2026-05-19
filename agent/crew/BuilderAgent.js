'use strict';

const AgentBase = require('../AgentBase');
const fileTool  = require('../../tools/file');
const path      = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '../../');
const OUTPUT_ROOT   = path.resolve(__dirname, '../../output');
if (!require('fs').existsSync(OUTPUT_ROOT)) require('fs').mkdirSync(OUTPUT_ROOT, { recursive: true });
const PROTECTED    = ['main.js', 'orchestrator.js', 'package.json', '.env'];

class BuilderAgent extends AgentBase {
  constructor() {
    super({
      id         : 'builder',
      role       : 'Builder',
      model      : 'meta/llama-3.3-70b-instruct',
      color      : '\x1b[32m',
      personality: 'Kamu adalah Senior Software Engineer. Tulis kode LENGKAP dan LANGSUNG BISA DIJALANKAN. Tidak ada placeholder, tidak ada TODO. Error handling wajib ada. Format output: === FILE: nama === ... === END FILE ===',
    });
  }

  setArchitect(arch) { this.architect = arch; }

  async work(task) {
    const attempt = (task.attempts || 0) + 1;
    this.memory.setCurrentTask(task);
    if (attempt === 1) this.say('Siap, mulai build: "' + task.desc + '"');
    else { this.say('Revisi attempt ' + attempt + '...'); this.memory.incrementAttempt(task.feedback || ''); }

    const wantsPython  = /\b(python|\.py|pip|flask|django|fastapi)\b/i.test(task.desc);
    const lang         = wantsPython ? 'Python' : 'Node.js';
    const archHint     = (task.architecture || '').slice(0, 400);
    const researchHint = (task.research     || '').slice(0, 400);
    const feedbackHint = (task.feedback     || '').slice(0, 500);

    const formatExample = [
      '=== FILE: index.js ===',
      'console.log("hello world");',
      '=== END FILE ===',
      '',
      '=== FILE: .env.example ===',
      'PORT=3000',
      '=== END FILE ===',
      '',
      '=== FILE: README.md ===',
      '# Project',
      'Run: node index.js',
      '=== END FILE ===',
    ].join('\n');

    const parts = [
      'Buat ' + lang + ' project LENGKAP untuk task berikut.',
      '',
      'TASK: ' + task.desc,
      archHint     ? 'ARSITEKTUR:\n' + archHint         : '',
      researchHint ? 'BEST PRACTICES:\n' + researchHint : '',
      feedbackHint ? 'FEEDBACK WAJIB DIPERBAIKI:\n' + feedbackHint : '',
      '',
      'WAJIB:',
      '- Kode lengkap, tidak ada placeholder',
      '- Error handling di semua async operations',
      '- Config sensitif pakai process.env + dotenv',
      '',
      'FORMAT OUTPUT - IKUTI PERSIS CONTOH INI:',
      formatExample,
      '',
      'ATURAN KERAS:',
      '- SETIAP file WAJIB diawali === FILE: nama === dan diakhiri === END FILE ===',
      '- DILARANG pakai backtick atau markdown fence',
      '- DILARANG ada teks di luar blok FILE',
      '- Minimal 3 file: file utama, .env.example, README.md',
    ];
    const prompt = parts.filter(Boolean).join('\n');

    // Set output dir unik per subtask
const subtaskSlug = task.desc.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 20);
this.say('Nulis kode...');
    let output = null, lastErr = null;

    for (let t = 1; t <= 3; t++) {
      try {
        output = await this.think(prompt, { maxTokens: 2500, temperature: Math.min(0.2 + t * 0.1, 0.5) });
        const len = output ? output.trim().length : 0;
        if (len > 100) { this.say('Got ' + len + ' chars'); break; }
        output = null;
        this.say('Short response, retry ' + t + '/3...');
        await new Promise(r => setTimeout(r, 3000 * t));
      } catch (err) {
        lastErr = err;
        this.say('Error try ' + t + '/3: ' + err.message);
        if (t < 3) await new Promise(r => setTimeout(r, 3000 * t));
      }
    }

    if (!output || output.trim().length < 100) {
      const msg = lastErr?.message || 'Response kosong setelah 3x retry';
      this.say('Gagal: ' + msg);
      return { ok: false, role: 'builder', error: msg };
    }

    if (output.includes('=== FILE:') && !output.includes('=== END')) output += '\n=== END FILE ===';

    const normalized = output
      .replace(/===\s*FILE:\s*(.+?)\s*===\s*\n```[\w]*\n?/g, '=== FILE: $1 ===\n')
      .replace(/\n```\s*\n===\s*END/g, '\n=== END')
      .replace(/===\s*END\s*FILE\s*===/g, '=== END FILE ===');

    const FILE_PATTERN = /===\s*FILE:\s*(.+?)\s*===\n([\s\S]+?)===\s*END(?:\s*FILE)?\s*===/g;
    const savedFiles = [], savedPaths = new Set();
    let match;

    while ((match = FILE_PATTERN.exec(normalized)) !== null) {
      const rawPath = match[1].trim(), content = match[2].trim();
      if (!rawPath || !content) continue;
      if (PROTECTED.includes(path.basename(rawPath))) continue;
      const absPath = path.resolve(OUTPUT_ROOT, rawPath);
      if (!absPath.startsWith(OUTPUT_ROOT) || savedPaths.has(absPath)) continue;
      try {
        savedPaths.add(absPath);
        await fileTool.write(absPath, content);
        savedFiles.push(rawPath);
        this.say('✅ Tersimpan: ' + rawPath);
      } catch (err) { this.say('⚠️ Gagal simpan ' + rawPath + ': ' + err.message); }
    }

    if (savedFiles.length === 0) return { ok: false, role: 'builder', error: 'Tidak ada file tersimpan', output };
    this.say('Done! ' + savedFiles.length + ' file: ' + savedFiles.join(', '));
    return { ok: true, role: 'builder', output, savedFiles };
  }
}

module.exports = BuilderAgent;
