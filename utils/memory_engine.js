'use strict';

const fs = require('fs');
const path = require('path');

const MEM_DIR = path.resolve(__dirname, '../memory');

const FILES = {
  short: path.join(MEM_DIR, 'short_term.json'),
  long: path.join(MEM_DIR, 'long_term.json'),
  skills: path.join(MEM_DIR, 'skills.json'),
  profile: path.join(MEM_DIR, 'user_profile.json'),
};

const LIMITS = { short: 15, long: 100, skills: 50 };

function readJSON(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, 'utf8').trim();
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error(
      `[memory] Gagal tulis ${path.basename(filePath)}:`,
      err.message
    );
  }
}

const STOPWORDS = new Set([
  'yang',
  'dan',
  'di',
  'ke',
  'dari',
  'untuk',
  'dengan',
  'adalah',
  'ini',
  'itu',
  'ada',
  'pada',
  'tidak',
  'bisa',
  'akan',
  'sudah',
  'juga',
  'atau',
  'saya',
  'gue',
  'lo',
  'kamu',
  'anda',
  'the',
  'is',
  'are',
  'was',
  'a',
  'an',
  'of',
  'to',
  'in',
  'it',
]);

const SYNONYMS = {
  buat: 'bikin',
  bikin: 'buat',
  app: 'aplikasi',
  aplikasi: 'app',
  script: 'kode',
  kode: 'script',
  program: 'aplikasi',
  cari: 'search',
  search: 'cari',
  browsing: 'cari',
  hapus: 'delete',
  delete: 'hapus',
  tambah: 'add',
  add: 'tambah',
  tampil: 'show',
  show: 'tampil',
  lihat: 'show',
  error: 'bug',
  bug: 'error',
  fix: 'perbaiki',
  perbaiki: 'fix',
  bikin: 'create',
  create: 'bikin',
  buat: 'create',
};

function expandSynonyms(tokens) {
  const expanded = [...tokens];
  for (const t of tokens) {
    if (SYNONYMS[t]) expanded.push(SYNONYMS[t]);
  }
  return expanded;
}

function tokenize(text) {
  const tokens = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
  return expandSynonyms(tokens);
}

function cosineSimilarity(tokensA, tokensB) {
  const freqA = {},
    freqB = {};
  tokensA.forEach((t) => (freqA[t] = (freqA[t] || 0) + 1));
  tokensB.forEach((t) => (freqB[t] = (freqB[t] || 0) + 1));

  const allTerms = new Set([...Object.keys(freqA), ...Object.keys(freqB)]);
  let dot = 0,
    magA = 0,
    magB = 0;

  for (const term of allTerms) {
    const a = freqA[term] || 0;
    const b = freqB[term] || 0;
    dot += a * b;
    magA += a * a;
    magB += b * b;
  }

  const mag = Math.sqrt(magA) * Math.sqrt(magB);
  return mag === 0 ? 0 : dot / mag;
}

function similarity(textA, textB) {
  return cosineSimilarity(tokenize(textA), tokenize(textB));
}

function loadMemory() {
  return {
    short: readJSON(FILES.short, []),
    long: readJSON(FILES.long, []),
    skills: readJSON(FILES.skills, []),
    profile: readJSON(FILES.profile, {
      tone: 'santai',
      preferences: [],
      updatedAt: null,
    }),
  };
}

function saveShortTerm(input, output) {
  if (!output || output.trim().length < 5) return;
  const lower = output.toLowerCase();

  if (lower.startsWith('error:') || lower.startsWith('provider error')) return;
  if (output.includes('=== FILE:') || output.includes('✓ Done!')) return;

  const items = readJSON(FILES.short, []);
  const isDup = items.some(
    (i) => i.input?.toLowerCase() === input?.toLowerCase()
  );
  if (isDup) {
    const idx = items.findIndex(
      (i) => i.input?.toLowerCase() === input?.toLowerCase()
    );
    items[idx].output = output.slice(0, 300);
    items[idx].ts = Date.now();
    writeJSON(FILES.short, items.slice(-LIMITS.short));
    return;
  }

  if (items.length >= 12) {
    const old5 = items.splice(0, 5);
    const cleanOld = old5.filter(
      (i) => i.input !== '[summary]'
    );

    const summary = cleanOld
      .map((i) => `- ${i.input}: ${i.output?.slice(0, 80)}`)
      .join('\n');
    items.unshift({ input: '[summary]', output: summary, ts: Date.now() });
  }

  items.push({ input, output: output.slice(0, 300), ts: Date.now() });
  writeJSON(FILES.short, items.slice(-LIMITS.short));
}

function saveLongTerm(data) {
  const items = readJSON(FILES.long, []);
  const isDuplicate = items.some(
    (i) => similarity(i.content || '', data.content || '') > 0.85
  );
  if (isDuplicate) return;
  items.push({
    id: Date.now().toString(),
    type: data.type || 'general',
    content: data.content || '',
    tags: data.tags || [],
    source: data.source || 'agent',
    ts: Date.now(),
  });
  writeJSON(FILES.long, items.slice(-LIMITS.long));
}

function updateUserProfile(input) {
  const profile = readJSON(FILES.profile, {
    tone: 'santai',
    preferences: [],
    updatedAt: null,
  });
  const lower = input.toLowerCase();
  if (['mohon', 'dengan hormat', 'saya ingin'].some((s) => lower.includes(s)))
    profile.tone = 'formal';
  if (['dong', 'deh', 'gw', 'lu', 'gak', 'ga '].some((s) => lower.includes(s)))
    profile.tone = 'santai';
  if (['langsung', 'singkat', 'simple'].some((s) => lower.includes(s)))
    profile.tone = 'langsung';
  if (lower.includes('simple') || lower.includes('singkat')) {
    if (!profile.preferences.includes('simple'))
      profile.preferences.push('simple');
  }
  if (lower.includes('detail') || lower.includes('lengkap')) {
    if (!profile.preferences.includes('detail'))
      profile.preferences.push('detail');
  }
  profile.updatedAt = new Date().toISOString();
  writeJSON(FILES.profile, profile);
}

function saveSkill(task, result) {
  const skills = readJSON(FILES.skills, []);
  const isDuplicate = skills.some(
    (s) => similarity(s.pattern || '', task.input || '') > 0.85
  );
  if (isDuplicate) return;
  const usedRoles = result.steps?.filter((s) => s.ok).map((s) => s.role) || [];
  skills.push({
    id: Date.now().toString(),
    taskType: task.type,
    pattern: task.input?.slice(0, 200) || '',
    roles: usedRoles,
    summary: result.output?.slice(0, 300) || '',
    ts: Date.now(),
  });
  writeJSON(FILES.skills, skills.slice(-LIMITS.skills));
}

function retrieveRelevant(input, maxItems = 5) {
  const results = [];
  for (const item of readJSON(FILES.long, [])) {
    const score = similarity(input, item.content || '');
    if (score > 0.1) results.push({ score, type: 'long', data: item });
  }
  for (const skill of readJSON(FILES.skills, [])) {
    const score = similarity(input, skill.pattern + ' ' + skill.taskType || '');
    if (score > 0.1) results.push({ score, type: 'skill', data: skill });
  }
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, maxItems)
    .map((r) => ({
      type: r.type,
      content: r.type === 'skill' ? r.data.summary : r.data.content,
      tags: r.data.tags || [],
      score: r.score,
    }));
}

function findSkill(input) {
  const skills = readJSON(FILES.skills, []);
  let best = null,
    bestScore = 0;
  for (const skill of skills) {
    const score = similarity(input, skill.pattern + ' ' + skill.taskType || '');
    if (score > bestScore) {
      bestScore = score;
      best = skill;
    }
  }
  return bestScore >= 0.3 ? best : null;
}

module.exports = {
  loadMemory,
  saveShortTerm,
  saveLongTerm,
  updateUserProfile,
  saveSkill,
  retrieveRelevant,
  findSkill,
  similarity,
};
