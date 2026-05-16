'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SKILLS_DIR = path.join(__dirname, '..', 'skills');
const PATTERNS_FILE = path.join(__dirname, '..', 'memory', 'patterns.json');
const SKILL_STATS_FILE = path.join(
  __dirname,
  '..',
  'memory',
  'skill_stats.json'
);

if (!fs.existsSync(SKILLS_DIR)) fs.mkdirSync(SKILLS_DIR, { recursive: true });

// ── Pattern Storage ──────────────────────────────────────────
function loadPatterns() {
  try {
    return JSON.parse(fs.readFileSync(PATTERNS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function savePatterns(patterns) {
  fs.writeFileSync(PATTERNS_FILE, JSON.stringify(patterns, null, 2));
}

// ── Skill Stats (Bayesian confidence) ────────────────────────
function loadSkillStats() {
  try {
    return JSON.parse(fs.readFileSync(SKILL_STATS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveSkillStats(stats) {
  fs.writeFileSync(SKILL_STATS_FILE, JSON.stringify(stats, null, 2));
}

function updateSkillConfidence(skillName, success) {
  const stats = loadSkillStats();
  if (!stats[skillName]) {
    stats[skillName] = {
      successes: 0,
      failures: 0,
      confidence: 0.5,
      lastUsed: Date.now(),
    };
  }
  if (success) stats[skillName].successes++;
  else stats[skillName].failures++;

  const total = stats[skillName].successes + stats[skillName].failures;
  stats[skillName].confidence =
    total > 0 ? stats[skillName].successes / total : 0.5;
  stats[skillName].lastUsed = Date.now();

  saveSkillStats(stats);
  return stats[skillName];
}

// ── Analyze conversation for patterns ────────────────────────
function analyzePattern(conversation) {
  const patterns = loadPatterns();
  const input = conversation.input || '';
  const output = conversation.output || '';
  const lower = input.toLowerCase();

  let taskType = null;
  if (/\b(buat|bikin|generate)\s+(script|kode|app|api)\b/i.test(lower))
    taskType = 'code_gen';
  else if (
    /\b(cari|browsing|search)\s+(harga|informasi|berita|data)\b/i.test(lower)
  )
    taskType = 'web_search';
  else if (
    /\b(fix|debug|benerin|perbaiki)\s+(error|bug|kode|masalah)\b/i.test(lower)
  )
    taskType = 'fix_code';
  else if (/\b(jalankan|run|eksekusi)\s+(script|file|program)\b/i.test(lower))
    taskType = 'execute';
  else if (/\b(analisa|analisis|review|cek)\s+(kode|file|hasil)\b/i.test(lower))
    taskType = 'review';
  else if (/\b(ingetin|ingatkan|remind|jadwal)\b/i.test(lower))
    taskType = 'reminder';
  else return null;

  if (!patterns[taskType]) {
    patterns[taskType] = {
      type: taskType,
      count: 0,
      successes: 0,
      examples: [],
      keywords: [],
      firstSeen: Date.now(),
      lastSeen: Date.now(),
    };
  }

  const p = patterns[taskType];
  p.count++;
  p.lastSeen = Date.now();
  if (
    output &&
    output.length > 20 &&
    !output.includes('error') &&
    !output.includes('gagal')
  ) {
    p.successes++;
  }

  // Simpan contoh sukses untuk learning
  if (output && output.length > 50 && p.examples.length < 5) {
    // Ekstrak template dari output
    const template = extractTemplate(taskType, input, output);
    if (template) {
      p.examples.push({
        input: input.slice(0, 200),
        output: output.slice(0, 300),
        template,
        timestamp: Date.now(),
      });
    }
  }

  // Update keywords
  const words = lower
    .split(/\s+/)
    .filter(
      (w) =>
        w.length > 3 &&
        !['yang', 'dengan', 'untuk', 'dalam', 'pada', 'dari'].includes(w)
    );
  words.forEach((w) => {
    if (!p.keywords.includes(w)) p.keywords.push(w);
  });

  savePatterns(patterns);
  return patterns[taskType];
}

// ── Extract dynamic template from successful output ──────────
function extractTemplate(taskType, input, output) {
  // Cari pola di output yang bisa jadi template
  const lines = output.split('\n');

  if (taskType === 'code_gen') {
    // Ekstrak struktur kode
    const codeLines = lines.filter(
      (l) =>
        l.includes('function ') ||
        l.includes('const ') ||
        l.includes('require(') ||
        l.includes('module.exports')
    );
    if (codeLines.length >= 2) {
      return codeLines.slice(0, 5).join('\n');
    }
  }

  if (taskType === 'web_search') {
    // Ekstrak format hasil search
    const resultLines = lines.filter(
      (l) => l.includes('URL:') || l.includes('snippet') || l.includes('title')
    );
    if (resultLines.length >= 2) {
      return 'Search format: ' + resultLines.slice(0, 2).join(' | ');
    }
  }

  if (taskType === 'fix_code') {
    const fixLines = lines.filter(
      (l) =>
        l.includes('error') ||
        l.includes('fix') ||
        l.includes('saran') ||
        l.includes('suggestion')
    );
    if (fixLines.length >= 1) {
      return 'Fix pattern: ' + fixLines.slice(0, 2).join(' | ');
    }
  }

  return null;
}

// ── Improved maturity check ──────────────────────────────────
function isMature(patternKey) {
  const patterns = loadPatterns();
  const p = patterns[patternKey];
  if (!p) return false;

  const recent = Date.now() - p.lastSeen < 24 * 60 * 60 * 1000;
  const successRate = p.count > 0 ? p.successes / p.count : 0;

  // Minimal 3x, success rate > 60%, dan baru dipakai
  return p.count >= 3 && successRate > 0.6 && recent;
}

// ── Generate dynamic skill (improved) ────────────────────────
function evolveSkill(patternKey) {
  const patterns = loadPatterns();
  const p = patterns[patternKey];
  if (!p) return null;

  // Ambil contoh terbaik sebagai template
  const bestExample = p.examples
    .sort((a, b) => (a.output?.length || 0) - (b.output?.length || 0))
    .pop();

  const skillName = `evolved_${patternKey}`;
  const skillFile = path.join(SKILLS_DIR, `${skillName}.js`);

  // Jangan overwrite, tapi improve
  let version = 1;
  if (fs.existsSync(skillFile)) {
    const existing = fs.readFileSync(skillFile, 'utf8');
    const verMatch = existing.match(/version:\s*(\d+)/);
    version = verMatch ? parseInt(verMatch[1]) + 1 : 2;
  }

  const code = `'use strict';
// Auto-evolved skill v${version} — Pattern: ${patternKey}
// Generated: ${new Date().toISOString()}
// Usage count: ${p.count} | Success rate: ${Math.round((p.successes / p.count) * 100)}%

module.exports = {
  name: '${skillName}',
  version: ${version},
  description: 'Auto-generated from ${patternKey} pattern (${p.count}x usage, ${Math.round((p.successes / p.count) * 100)}% success)',
  
  async execute(args, context) {
    const input = args.input || args.prompt;
    if (!input) return 'Need input';

    ${
  bestExample && bestExample.template
    ? `// Learned template from successful execution:\n    // ${bestExample.template.slice(0, 200)}`
    : '// No template yet — learning...'
}
    
    // TODO: Implement based on pattern
    return 'Skill v${version} ready. Processing: ' + input.slice(0, 100);
  }
};`;

  fs.writeFileSync(skillFile, code);

  // Record skill creation
  const babuMind = require('./babu_mind');
  babuMind.addDiaryEntry(
    `[EVOLVE v2] ${skillName} v${version} created from ${patternKey} pattern (${p.count}x, ${Math.round((p.successes / p.count) * 100)}% success)`,
    0.9
  );

  return {
    name: skillName,
    version,
    status: 'evolved',
    file: `skills/${skillName}.js`,
    pattern: patternKey,
    confidence: Math.round((p.successes / p.count) * 100),
  };
}

// ── Validate skill before deploy ─────────────────────────────
function validateSkill(skillName) {
  const skillFile = path.join(SKILLS_DIR, `${skillName}.js`);
  if (!fs.existsSync(skillFile))
    return { valid: false, error: 'File not found' };

  try {
    // Cek syntax
    execSync(`node -c ${skillFile} 2>&1`, { timeout: 5000 });

    // Cek exports
    const skill = require(skillFile);
    if (!skill.name || !skill.execute) {
      return { valid: false, error: 'Missing name or execute' };
    }

    return { valid: true, name: skill.name };
  } catch (e) {
    return { valid: false, error: e.message };
  }
}

// ── Auto-evolve dengan validation ────────────────────────────
function autoEvolve() {
  const patterns = loadPatterns();
  const evolved = [];

  for (const key of Object.keys(patterns)) {
    if (isMature(key)) {
      const result = evolveSkill(key);
      if (result) {
        // Validate before reporting
        const validation = validateSkill(result.name);
        result.valid = validation.valid;
        evolved.push(result);
      }
    }
  }

  return evolved;
}

// ── Get evolvable patterns ──────────────────────────────────
function getEvolvablePatterns() {
  const patterns = loadPatterns();
  const evolvable = [];

  for (const [key, p] of Object.entries(patterns)) {
    if (p.count >= 2) {
      evolvable.push({
        type: key,
        count: p.count,
        successes: p.successes,
        successRate: Math.round((p.successes / p.count) * 100),
        examples: p.examples.length,
        keywords: p.keywords.slice(0, 5),
        maturity: isMature(key) ? 'READY' : 'growing',
        lastSeen: new Date(p.lastSeen).toLocaleString(),
      });
    }
  }

  return evolvable;
}

// ── Run every 10 minutes ─────────────────────────────────────
setInterval(
  () => {
    const evolved = autoEvolve();
    if (evolved.length) {
      console.log(
        '[BABU_EVOLVE v2] Skills evolved:',
        evolved.map((e) => `${e.name} (valid:${e.valid})`).join(', ')
      );
    }
  },
  10 * 60 * 1000
);

module.exports = {
  analyzePattern,
  isMature,
  evolveSkill,
  autoEvolve,
  getEvolvablePatterns,
  validateSkill,
  updateSkillConfidence,
};
