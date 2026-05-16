'use strict';
const babuVector = require('./babu_vector');

const fs = require('fs');
const path = require('path');

const MIND_FILE = path.join(__dirname, '..', 'memory', 'babu_mind.json');
const SAVE_DELAY = 2000;

let _cache = null;
let _dirty = false;
let _saveTimer = null;

// ── Atomic save ──────────────────────────────────────────
function _load() {
  if (_cache) return _cache;
  try {
    _cache = JSON.parse(fs.readFileSync(MIND_FILE, 'utf8'));
    // Pastiin semua field ada
    if (!_cache.cells) _cache.cells = [];
    if (!_cache.scenes) _cache.scenes = [];
    if (!_cache.foresight) _cache.foresight = [];
    if (!_cache.stats)
      _cache.stats = {
        totalChats: 0,
        totalBuilds: 0,
        totalErrors: 0,
        sessionStart: Date.now(),
      };
    if (!_cache.emotion)
      _cache.emotion = {
        tension: 0,
        connection: 0.5,
        energy: 0.8,
        focus: 0.5,
        updatedAt: Date.now(),
      };
  } catch {
    _cache = {
      beliefs: [],
      cells: [],
      scenes: [],
      emotion: {
        tension: 0,
        connection: 0.5,
        energy: 0.8,
        focus: 0.5,
        updatedAt: Date.now(),
      },
      patterns: [],
      foresight: [],
      stats: {
        totalChats: 0,
        totalBuilds: 0,
        totalErrors: 0,
        sessionStart: Date.now(),
      },
    };
  }
  return _cache;
}

function _markDirty() {
  _dirty = true;
  if (!_saveTimer) {
    _saveTimer = setTimeout(() => {
      const dir = path.dirname(MIND_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const tmp = MIND_FILE + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(_cache, null, 2));
      fs.renameSync(tmp, MIND_FILE);
      _dirty = false;
      _saveTimer = null;
    }, SAVE_DELAY);
  }
}

function _flush() {
  if (_saveTimer) {
    clearTimeout(_saveTimer);
    _saveTimer = null;
  }
  if (_dirty) {
    fs.writeFileSync(MIND_FILE, JSON.stringify(_cache, null, 2));
    _dirty = false;
  }
}

// ── Bayesian Beliefs ─────────────────────────────────────
function addBelief(dimension, value, confidence = 0.5, source = 'chat') {
  const data = _load();
  const valKey = value.toLowerCase().slice(0, 50);
  const existing = data.beliefs.find(
    (b) =>
      b.dimension === dimension &&
      b.value.toLowerCase().slice(0, 50) === valKey &&
      !b.contradicted
  );
  if (existing) {
    const n = existing.evidence || 1;
    existing.confidence = Math.min(
      0.95,
      (existing.confidence * n + confidence) / (n + 1)
    );
    existing.evidence = n + 1;
    existing.updatedAt = Date.now();
    existing.activations = (existing.activations || 0) + 1;
  } else {
    data.beliefs.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      dimension,
      value: value.slice(0, 300),
      confidence,
      evidence: 1,
      source,
      contradicted: false,
      activations: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }
  _markDirty();
}

function contradictBelief(dimension, oldValue, newValue) {
  const data = _load();
  const old = data.beliefs.find(
    (b) =>
      b.dimension === dimension &&
      b.value.toLowerCase().includes(oldValue.toLowerCase().slice(0, 30))
  );
  if (old) {
    old.contradicted = true;
    old.updatedAt = Date.now();
  }
  if (newValue) addBelief(dimension, newValue, 0.6, 'contradiction');
  _markDirty();
}

function getBeliefs(dimension = null, minConfidence = 0.3) {
  const data = _load();
  let beliefs = data.beliefs.filter(
    (b) => !b.contradicted && b.confidence >= minConfidence
  );
  if (dimension) beliefs = beliefs.filter((b) => b.dimension === dimension);
  return beliefs.sort((a, b) => b.confidence - a.confidence);
}

// ── MemCells ─────────────────────────────────────────────
function storeMemory(text, emotionScore = 0.3, importance = 0.5, tags = []) {
  const data = _load();
  data.cells.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    text: text.slice(0, 600),
    emotion: emotionScore,
    importance,
    strength: 0.3 + emotionScore * 0.4,
    tags,
    theme: null,
    activations: 0,
    createdAt: Math.floor(Date.now() / 1000),
    lastTouched: Math.floor(Date.now() / 1000),
  });
  if (data.cells.length > 500) data.cells = data.cells.slice(-500);
  _markDirty();
}

function recallMemory(query = '', limit = 7) {
  const data = _load();
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);
  const emotion = data.emotion;
  const scored = data.cells.map((cell) => {
    let score =
      cell.strength * 0.3 + cell.importance * 0.3 + cell.emotion * 0.2;
    words.forEach((w) => {
      if (cell.text.toLowerCase().includes(w)) score += 0.15;
    });
    if (emotion.tension > 0.5 && cell.emotion > 0.5) score += 0.2;
    return { ...cell, _score: score };
  });
  const top = scored.sort((a, b) => b._score - a._score).slice(0, limit);
  const now = Math.floor(Date.now() / 1000);
  top.forEach((t) => {
    const orig = data.cells.find((c) => c.id === t.id);
    if (!orig) return;
    orig.activations++;
    orig.lastTouched = now;
    orig.strength = Math.min(
      2.0,
      orig.strength + 0.1 / (1 + Math.log1p(orig.activations * 0.5))
    );
  });
  _markDirty();
  return top;
}

function decayMemories() {
  const data = _load();
  const now = Math.floor(Date.now() / 1000);
  for (let i = data.cells.length - 1; i >= 0; i--) {
    const cell = data.cells[i];
    const hoursSinceTouch = (now - cell.lastTouched) / 3600;
    if (hoursSinceTouch < 0.1) continue;
    const decayRate =
      0.008 * hoursSinceTouch * (cell.emotion >= 0.65 ? 0.3 : 1.0);
    cell.strength = Math.max(0, cell.strength - decayRate);
    if (cell.strength < 0.05 && cell.emotion < 0.65) data.cells.splice(i, 1);
  }
  _markDirty();
}

// ── MemScenes ────────────────────────────────────────────
function clusterScenes() {
  const data = _load();
  const cells = data.cells.filter((c) => c.strength > 0.4);
  const themes = {
    frustrasi: ['error', 'bug', 'gagal', 'timeout', 'lemot'],
    koding: ['script', 'code', 'app', 'program', 'build'],
    ngobrol: ['ngobrol', 'cerita', 'curhat', 'pengen'],
    semangat: ['gas', 'ayo', 'yuk', 'mantap', 'jos'],
    lelah: ['capek', 'lelah', 'tidur', 'bosen'],
    ide: ['ide', 'kayaknya', 'coba', 'rencana'],
  };
  const scenes = [];
  const assigned = new Set();
  for (const [theme, keywords] of Object.entries(themes)) {
    const related = cells.filter(
      (c) =>
        !assigned.has(c.id) &&
        keywords.some((k) => c.text.toLowerCase().includes(k))
    );
    if (related.length >= 2) {
      scenes.push({
        theme,
        cells: related.map((c) => c.id),
        count: related.length,
        avgEmotion: related.reduce((s, c) => s + c.emotion, 0) / related.length,
        clusteredAt: Date.now(),
      });
      related.forEach((c) => assigned.add(c.id));
    }
  }
  data.scenes = scenes.slice(-10);
  _markDirty();
  return scenes;
}

// ── Foresight ────────────────────────────────────────────
function predictNextAction() {
  const data = _load();
  const hour = new Date().getHours();
  const predictions = [];
  if (hour >= 23 || hour <= 4)
    predictions.push('user mungkin butuh temen ngobrol malem');
  if (hour >= 9 && hour <= 12)
    predictions.push('user produktif pagi — siap bantu');
  if (data.emotion.tension > 0.5)
    predictions.push('butuh solusi cepet, bukan penjelasan panjang');
  if (data.emotion.energy < 0.3)
    predictions.push('user lelah — jawab singkat aja');
  if (data.emotion.connection > 0.7)
    predictions.push('user udah nyaman — bisa santai');
  data.foresight = predictions.slice(0, 5);
  _markDirty();
  return predictions;
}

// ── Emotion Engine ───────────────────────────────────────
function updateEmotion(message) {
  const data = _load();
  const lower = message.toLowerCase();
  const signals = {
    frustrasi: ['error', 'bug', 'gagal', 'anjir', 'timeout', 'lama', 'lemot'],
    akrab: ['gue', 'gw', 'lu', 'lo', 'dong', 'deh', 'sih', 'bro'],
    semangat: ['gas', 'ayo', 'yuk', 'mantap', 'keren', 'jos'],
    lelah: ['capek', 'lelah', 'tidur', 'bosen', 'males'],
  };
  let tensionDelta = 0,
    connectionDelta = 0,
    energyDelta = 0;
  signals.frustrasi.forEach((w) => {
    if (lower.includes(w)) tensionDelta += 0.15;
  });
  signals.akrab.forEach((w) => {
    if (lower.includes(w)) connectionDelta += 0.08;
  });
  signals.semangat.forEach((w) => {
    if (lower.includes(w)) energyDelta += 0.1;
  });
  signals.lelah.forEach((w) => {
    if (lower.includes(w)) energyDelta -= 0.08;
  });
  const inertia = 0.7;
  const e = data.emotion;
  e.tension = Math.max(
    0,
    Math.min(
      1,
      e.tension * inertia + (e.tension + tensionDelta) * (1 - inertia)
    )
  );
  e.connection = Math.max(
    0,
    Math.min(
      1,
      e.connection * inertia + (e.connection + connectionDelta) * (1 - inertia)
    )
  );
  e.energy = Math.max(
    0,
    Math.min(1, e.energy * inertia + (e.energy + energyDelta) * (1 - inertia))
  );
  e.tension *= 0.95;
  e.energy = Math.max(0.1, e.energy * 0.99);
  e.updatedAt = Date.now();
  _markDirty();
  return e;
}

function describeEmotion() {
  const { emotion } = _load();
  const parts = [];
  if (emotion.tension > 0.7)
    parts.push('frustrasi tinggi — butuh solusi INSTAN');
  else if (emotion.tension > 0.4) parts.push('ada ketegangan — hati-hati');
  else parts.push('santai');
  if (emotion.connection > 0.7) parts.push('akrab banget');
  else if (emotion.connection > 0.4) parts.push('cukup akrab');
  if (emotion.energy > 0.7) parts.push('semangat');
  else if (emotion.energy < 0.3) parts.push('lemes — jawab singkat');
  return parts.join(', ');
}

// ── Stats ────────────────────────────────────────────────
function incrementStat(type) {
  const data = _load();
  if (type === 'chat') data.stats.totalChats++;
  if (type === 'build') data.stats.totalBuilds++;
  if (type === 'error') data.stats.totalErrors++;
  _markDirty();
}

function getStats() {
  const data = _load();
  const uptime = Math.floor((Date.now() - data.stats.sessionStart) / 1000);
  return {
    ...data.stats,
    uptime: Math.floor(uptime / 60) + 'm ' + (uptime % 60) + 's',
    beliefs: data.beliefs.filter((b) => !b.contradicted).length,
    memories: data.cells.length,
    scenes: data.scenes.length,
  };
}

function maintenance() {
  decayMemories();
  clusterScenes();
  predictNextAction();
}

process.on('exit', _flush);
process.on('SIGINT', () => {
  _flush();
  process.exit(0);
});
process.on('SIGTERM', () => {
  _flush();
  process.exit(0);
});

setInterval(maintenance, 30 * 60 * 1000);

module.exports = {
  addBelief,
  contradictBelief,
  getBeliefs,
  storeMemory,
  recallMemory,
  decayMemories,
  clusterScenes,
  predictNextAction,
  updateEmotion,
  describeEmotion,
  incrementStat,
  getStats,
  maintenance,
  _flush,
};
