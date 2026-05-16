'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MIND_DIR = path.join(__dirname, '..', 'memory');
const MIND_FILE = path.join(MIND_DIR, 'babu_mind.json');
const DIARY_FILE = path.join(MIND_DIR, 'babu_diary.jsonl');

// ─── BABU_DIARY: Buku Harian Super Efisien ala Hermes ─────────────────
class BabuDiary {
  constructor() {
    if (!fs.existsSync(MIND_DIR)) fs.mkdirSync(MIND_DIR, { recursive: true });
    this._loadOrCreate();
  }

  _loadOrCreate() {
    try {
      this.entries = fs
        .readFileSync(DIARY_FILE, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line));
      if (this.entries.length > 200) this.entries = this.entries.slice(-200);
    } catch {
      this.entries = [];
    }
  }

  _save() {
    const data = this.entries.map((e) => JSON.stringify(e)).join('\n') + '\n';
    fs.writeFileSync(DIARY_FILE, data);
  }

  // Nudge Engine: Otomatis pilih mana yang penting
  addEntry(text, metadata = {}) {
    const entry = {
      id: crypto.randomBytes(8).toString('hex'),
      text: text.slice(0, 500),
      ...metadata,
      timestamp: Date.now(),
    };

    this.entries.push(entry);

    // Kalau udah > 150 baris, lakukan "kurasi" ala Hermes
    if (this.entries.length > 150) {
      console.log('[BABU_MIND] Nudge Engine: Kurasi memori...');
      // Prioritaskan yang sering diakses & penting
      this.entries.sort((a, b) => {
        const scoreA = (a.accessCount || 0) * 0.6 + (a.importance || 0) * 0.4;
        const scoreB = (b.accessCount || 0) * 0.6 + (b.importance || 0) * 0.4;
        return scoreA - scoreB;
      });
      // Buang 50 terlemah
      this.entries = this.entries.slice(50);
    }

    this._save();
    return entry;
  }

  // Vector-style search: keyword + timestamp + importance
  search(query, limit = 5) {
    const keywords = query
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2);
    if (!keywords.length) return this.entries.slice(-limit);

    const scored = this.entries.map((entry) => {
      let score = 0;
      const text = entry.text.toLowerCase();
      keywords.forEach((kw) => {
        if (text.includes(kw)) score += 2;
      });
      score += (entry.importance || 0) * 0.5;
      score += (entry.accessCount || 0) * 0.1;
      return { ...entry, score };
    });

    const results = scored
      .filter((e) => e.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // Update access count untuk yang ditemukan
    results.forEach((e) => {
      const orig = this.entries.find((o) => o.id === e.id);
      if (orig) orig.accessCount = (orig.accessCount || 0) + 1;
    });
    this._save();

    return results;
  }
}

// ─── Singleton ────────────────────────────────────────────────────
const diary = new BabuDiary();

// ─── API Baru ─────────────────────────────────────────────────────
function addDiaryEntry(text, importance = 0.5) {
  return diary.addEntry(text, { importance });
}

function searchDiary(query, limit = 5) {
  return diary.search(query, limit);
}

// ─── Ekspor ───────────────────────────────────────────────────────
module.exports = {
  // API lama (dari babu_mind.js advanced)
  addBelief: require('./babu_mind').addBelief,
  getBeliefs: require('./babu_mind').getBeliefs,
  storeMemory: require('./babu_mind').storeMemory,
  recallMemory: require('./babu_mind').recallMemory,
  updateEmotion: require('./babu_mind').updateEmotion,
  describeEmotion: require('./babu_mind').describeEmotion,
  predictNextAction: require('./babu_mind').predictNextAction,

  // API baru ala Hermes
  addDiaryEntry,
  searchDiary,
};
