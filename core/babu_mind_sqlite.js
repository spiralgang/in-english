'use strict';

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const MIND_DIR = path.join(__dirname, '..', 'memory');
const DB_FILE = path.join(MIND_DIR, 'babu_mind.db');
const SQLITE = 'sqlite3';

if (!fs.existsSync(MIND_DIR)) fs.mkdirSync(MIND_DIR, { recursive: true });

// Helper: execute SQL
function run (sql) {
  try {
    const safe = sql.replaceAll('\'', '\'\'');
    execSync(SQLITE + ' ' + DB_FILE + ' "' + safe + '" 2>/dev/null', {
      timeout: 5000,
    });
  } catch (e) {}
};

// Helper: query SQL, return array
function query (sql) {
  try {
    const safe = sql.replaceAll('\'', '\'\'');
    const result = execSync(
      SQLITE + ' ' + DB_FILE + ' -json "' + safe + '" 2>/dev/null',
      {
        timeout: 5000,
        encoding: 'utf8',
      }
    );
    if (!result.trim()) return [];
    return JSON.parse(result);
  } catch (e) {
    return [];
  }
};

// Init tables
run(
  'CREATE TABLE IF NOT EXISTS beliefs (id TEXT PRIMARY KEY, dimension TEXT, value TEXT, confidence REAL DEFAULT 0.5, evidence INT DEFAULT 1, source TEXT DEFAULT \'chat\', contradicted INT DEFAULT 0, activations INT DEFAULT 0, created_at INT, updated_at INT)'
);
run(
  'CREATE TABLE IF NOT EXISTS memories (id TEXT PRIMARY KEY, text TEXT, emotion REAL DEFAULT 0.3, importance REAL DEFAULT 0.5, strength REAL DEFAULT 0.5, tags TEXT DEFAULT \'\', theme TEXT, activations INT DEFAULT 0, created_at INT, last_touched INT)'
);
run(
  'CREATE TABLE IF NOT EXISTS diary (id TEXT PRIMARY KEY, text TEXT, importance REAL DEFAULT 0.5, access_count INT DEFAULT 0, timestamp INT)'
);
run(
  'CREATE TABLE IF NOT EXISTS emotion (id INT PRIMARY KEY DEFAULT 1, tension REAL DEFAULT 0, connection REAL DEFAULT 0.5, energy REAL DEFAULT 0.8, focus REAL DEFAULT 0.5, updated_at INT)'
);
run('INSERT OR IGNORE INTO emotion (id) VALUES (1)');

// Bayesian Beliefs
function addBelief(dimension, value, confidence, source) {
  confidence = confidence || 0.5;
  source = source || 'chat';
  var now = Date.now();
  var existing = query(
    'SELECT * FROM beliefs WHERE dimension=\'' +
      dimension +
      '\' AND value=\'' +
      value.slice(0, 100) +
      '\' AND contradicted=0'
  );
  if (existing.length) {
    var b = existing[0];
    var n = b.evidence || 1;
    var newConf = Math.min(
      0.95,
      ((b.confidence || 0.5) * n + confidence) / (n + 1)
    );
    run(
      'UPDATE beliefs SET confidence=' +
        newConf +
        ', evidence=' +
        (n + 1) +
        ', activations=' +
        ((b.activations || 0) + 1) +
        ', updated_at=' +
        now +
        ' WHERE id=\'' +
        b.id +
        '\''
    );
  } else {
    var id = now.toString(36) + Math.random().toString(36).slice(2, 8);
    run(
      'INSERT INTO beliefs VALUES(\'' +
        id +
        '\',\'' +
        dimension +
        '\',\'' +
        value.slice(0, 300) +
        '\',' +
        confidence +
        ',1,\'' +
        source +
        '\',0,0,' +
        now +
        ',' +
        now +
        ')'
    );
  }
}

function getBeliefs(dimension, minConfidence) {
  minConfidence = minConfidence || 0.3;
  var sql =
    'SELECT dimension, value, confidence FROM beliefs WHERE contradicted=0 AND confidence>=' +
    minConfidence;
  if (dimension) sql += ' AND dimension=\'' + dimension + '\'';
  sql += ' ORDER BY confidence DESC';
  return query(sql);
}

// MemCells
function storeMemory(text, emotionScore, importance, tags) {
  emotionScore = emotionScore || 0.3;
  importance = importance || 0.5;
  tags = tags || [];
  var id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  var now = Math.floor(Date.now() / 1000);
  var strength = 0.3 + emotionScore * 0.4;
  run(
    'INSERT INTO memories VALUES(\'' +
      id +
      '\',\'' +
      text.slice(0, 600) +
      '\',' +
      emotionScore +
      ',' +
      importance +
      ',' +
      strength +
      ',\'' +
      tags.join(',') +
      '\',NULL,0,' +
      now +
      ',' +
      now +
      ')'
  );
}

function recallMemory(query, limit) {
  limit = limit || 7;
  var words = (query || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(function (w) {
      return w.length > 3;
    });
  var sql =
    'SELECT text, emotion, strength, importance FROM memories WHERE 1=1';
  if (words.length) {
    sql +=
      ' AND (' +
      words
        .map(function (w) {
          return 'text LIKE \'%' + w + '%\'';
        })
        .join(' OR ') +
      ')';
  }
  sql +=
    ' ORDER BY (strength*0.4 + importance*0.3 + emotion*0.3) DESC LIMIT ' +
    limit;
  return query(sql);
}

// Diary (Hermes-style)
function addDiaryEntry(text, importance) {
  importance = importance || 0.5;
  var id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  run(
    'INSERT INTO diary VALUES(\'' +
      id +
      '\',\'' +
      text.slice(0, 500) +
      '\',' +
      importance +
      ',0,' +
      Date.now() +
      ')'
  );
  var count = query('SELECT COUNT(*) as cnt FROM diary');
  if (count[0] && count[0].cnt > 150) {
    run(
      'DELETE FROM diary WHERE id IN (SELECT id FROM diary ORDER BY (importance*0.6+access_count*0.4) ASC LIMIT 50)'
    );
  }
}

function searchDiary(query, limit) {
  limit = limit || 5;
  var words = (query || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(function (w) {
      return w.length > 2;
    });
  var sql = 'SELECT text, importance, timestamp FROM diary';
  if (words.length) {
    sql +=
      ' WHERE ' +
      words
        .map(function (w) {
          return 'text LIKE \'%' + w + '%\'';
        })
        .join(' AND ');
  }
  sql += ' ORDER BY (importance*0.6+access_count*0.2) DESC LIMIT ' + limit;
  var results = query(sql);
  results.forEach(function (r) {
    run(
      'UPDATE diary SET access_count=access_count+1 WHERE text=\'' + r.text + '\''
    );
  });
  return results;
}

// Emotion Engine
function updateEmotion(message) {
  var e = query('SELECT * FROM emotion WHERE id=1');
  if (!e.length)
    return { tension: 0, connection: 0.5, energy: 0.8, focus: 0.5 };
  var lower = message.toLowerCase();
  var frustrasi = [
    'error',
    'bug',
    'gagal',
    'anjir',
    'timeout',
    'lama',
    'lemot',
  ];
  var akrab = ['gue', 'gw', 'lu', 'lo', 'dong', 'deh', 'sih', 'bro'];
  var semangat = ['gas', 'ayo', 'yuk', 'mantap', 'keren', 'jos'];
  var lelah = ['capek', 'lelah', 'tidur', 'bosen', 'males'];
  var td = 0,
    cd = 0,
    ed = 0;
  frustrasi.forEach(function (w) {
    if (lower.indexOf(w) !== -1) td += 0.15;
  });
  akrab.forEach(function (w) {
    if (lower.indexOf(w) !== -1) cd += 0.08;
  });
  semangat.forEach(function (w) {
    if (lower.indexOf(w) !== -1) ed += 0.1;
  });
  lelah.forEach(function (w) {
    if (lower.indexOf(w) !== -1) ed -= 0.08;
  });
  var inertia = 0.7;
  var nt = Math.max(
    0,
    Math.min(1, e[0].tension * inertia + (e[0].tension + td) * (1 - inertia))
  );
  var nc = Math.max(
    0,
    Math.min(
      1,
      e[0].connection * inertia + (e[0].connection + cd) * (1 - inertia)
    )
  );
  var ne = Math.max(
    0,
    Math.min(1, e[0].energy * inertia + (e[0].energy + ed) * (1 - inertia))
  );
  run(
    'UPDATE emotion SET tension=' +
      nt * 0.95 +
      ', connection=' +
      nc +
      ', energy=' +
      Math.max(0.1, ne * 0.99) +
      ', focus=' +
      e[0].focus +
      ', updated_at=' +
      Date.now() +
      ' WHERE id=1'
  );
  return { tension: nt, connection: nc, energy: ne, focus: e[0].focus };
}

function describeEmotion() {
  var e = query('SELECT * FROM emotion WHERE id=1');
  if (!e.length) return 'normal';
  var parts = [];
  if (e[0].tension > 0.7) parts.push('frustrasi tinggi');
  else if (e[0].tension > 0.4) parts.push('ada ketegangan');
  else parts.push('santai');
  if (e[0].connection > 0.7) parts.push('akrab banget');
  else if (e[0].connection > 0.4) parts.push('cukup akrab');
  return parts.join(', ');
}

function predictNextAction() {
  var hour = new Date().getHours();
  var e = query('SELECT * FROM emotion WHERE id=1');
  var predictions = [];
  if (hour >= 23 || hour <= 4)
    predictions.push('user mungkin butuh temen ngobrol malem');
  if (e.length && e[0].tension > 0.5) predictions.push('butuh solusi cepet');
  if (e.length && e[0].energy < 0.3) predictions.push('user lelah');
  return predictions;
}

function maintenance() {
  var weekAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 3600;
  run(
    'DELETE FROM memories WHERE last_touched < ' +
      weekAgo +
      ' AND strength < 0.1 AND emotion < 0.65'
  );
}

setInterval(maintenance, 30 * 60 * 1000);

module.exports = {
  addBelief: addBelief,
  getBeliefs: getBeliefs,
  storeMemory: storeMemory,
  recallMemory: recallMemory,
  addDiaryEntry: addDiaryEntry,
  searchDiary: searchDiary,
  updateEmotion: updateEmotion,
  describeEmotion: describeEmotion,
  predictNextAction: predictNextAction,
  maintenance: maintenance,
};

// ─── User Profile ─────────────────────────────────────────────────
function saveUserProfile(data) {
  try {
    const { execSync } = require('child_process');
    const dbPath = require('path').join(MIND_DIR, 'babu_mind.db');
    execSync(`sqlite3 "${dbPath}" "CREATE TABLE IF NOT EXISTS user_profile (key TEXT PRIMARY KEY, value TEXT, updated_at INTEGER);"`, { stdio: 'ignore' });
    for (const [key, value] of Object.entries(data)) {
      const val = String(value).replace(/'/g, "''");
      const k   = key.replace(/'/g, "''");
      execSync(`sqlite3 "${dbPath}" "INSERT OR REPLACE INTO user_profile (key, value, updated_at) VALUES ('${k}', '${val}', ${Date.now()});"`, { stdio: 'ignore' });
    }
    return true;
  } catch { return false; }
}

function getUserProfile() {
  try {
    const { execSync } = require('child_process');
    const dbPath = require('path').join(MIND_DIR, 'babu_mind.db');
    const result = execSync(`sqlite3 "${dbPath}" "SELECT key, value FROM user_profile;"`, { encoding: 'utf8' });
    const profile = {};
    result.trim().split('\n').forEach(line => {
      const [key, ...rest] = line.split('|');
      if (key) profile[key.trim()] = rest.join('|').trim();
    });
    return profile;
  } catch { return {}; }
}

module.exports.saveUserProfile = saveUserProfile;
module.exports.getUserProfile  = getUserProfile;
