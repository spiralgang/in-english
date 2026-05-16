'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const VERSION_FILE = path.join(PROJECT_ROOT, '.version');
const MEMORY_DIR = path.join(PROJECT_ROOT, 'memory');

function getVersion() {
  try {
    return fs.readFileSync(VERSION_FILE, 'utf8').trim();
  } catch {
    return 'unknown';
  }
}

function getProvider() {
  try {
    const envPath = path.join(PROJECT_ROOT, '.env');
    const env = fs.readFileSync(envPath, 'utf8');
    const match = env.match(/AI_PROVIDER=(\w+)/);
    return match ? match[1] : 'unknown';
  } catch {
    return 'unknown';
  }
}

function getMemoryType() {
  if (fs.existsSync(path.join(MEMORY_DIR, 'babu_mind.db'))) return 'SQLite';
  if (fs.existsSync(path.join(MEMORY_DIR, 'babu_mind.json'))) return 'JSON';
  return 'filesystem';
}

function getMemoryStats() {
  try {
    const mem = require('./babu_mind');
    const stats = mem.stats ? mem.stats() : {};
    return {
      memories: stats.memories || 0,
      beliefs: stats.beliefs || 0,
      conversations: stats.conversations || 0,
    };
  } catch {
    return { memories: 0, beliefs: 0, conversations: 0 };
  }
}

function getUptime() {
  try {
    const logPath = path.join(PROJECT_ROOT, 'logs', 'sibabu.log');
    if (fs.existsSync(logPath)) {
      const stat = fs.statSync(logPath);
      const hours = (Date.now() - stat.mtime) / 3600000;
      if (hours < 1) return 'baru mulai';
      if (hours < 24) return `${Math.floor(hours)} jam`;
      return `${Math.floor(hours / 24)} hari`;
    }
  } catch {}
  return 'unknown';
}

function getCrewAgents() {
  const crewDir = path.join(PROJECT_ROOT, 'agent', 'crew');
  if (!fs.existsSync(crewDir)) return [];
  try {
    return fs
      .readdirSync(crewDir)
      .filter((f) => f.endsWith('Agent.js'))
      .map((f) => f.replace('Agent.js', ''));
  } catch {
    return [];
  }
}

function answer(question) {
  const q = question.toLowerCase();
  const info = {
    version: getVersion(),
    provider: getProvider(),
    memoryType: getMemoryType(),
    memoryStats: getMemoryStats(),
    uptime: getUptime(),
    crews: getCrewAgents(),
    projectRoot: PROJECT_ROOT,
  };

  // Deteksi berdasarkan kata kunci — tapi ini PARSING, BUKAN TEMPLATE
  // Hasilnya dinamis dari data real

  if (q.includes('versi') || q.includes('version')) {
    return `SI BABU version ${info.version}`;
  }

  if (q.includes('provider') || q.includes('ai') || q.includes('model')) {
    return `Provider: ${info.provider}`;
  }

  if (q.includes('memory') || q.includes('ingatan')) {
    return `Memory type: ${info.memoryType}, ${info.memoryStats.memories} memories, ${info.memoryStats.beliefs} beliefs stored.`;
  }

  if (q.includes('tim') || q.includes('crew') || q.includes('agent')) {
    if (info.crews.length === 0) return 'No crew agents detected.';
    return `Crew agents: ${info.crews.join(', ')}`;
  }

  if (q.includes('siapa') || q.includes('nama')) {
    return 'Saya SI BABU, AI agent multi-crew yang berjalan di Termux.';
  }

  if (
    q.includes('bisa apa') ||
    q.includes('kemampuan') ||
    q.includes('fitur')
  ) {
    return `Kemampuan: chat santai, web search, bikin script, debug kode, baca file, task management, memory jangka panjang (${info.memoryType}).`;
  }

  if (q.includes('uptime') || q.includes('lama jalan')) {
    return `Uptime: ${info.uptime}`;
  }

  // Kalau gak ada yang match, return null biar LLM yang jawab
  return null;
}

module.exports = {
  answer,
  getVersion,
  getProvider,
  getMemoryType,
  getMemoryStats,
  getCrewAgents,
};
