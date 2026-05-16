'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CACHE_DIR = path.join(__dirname, '..', 'memory');
const CACHE_FILE = path.join(CACHE_DIR, 'prompt_cache.json');
const MAX_CACHE = 100; // max 100 entries
const TTL = 30 * 60 * 1000; // 30 menit expiry

let cache = null;

function loadCache() {
  if (cache) return cache;
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  } catch {
    cache = {};
  }

  // Clean expired
  const now = Date.now();
  let cleaned = false;
  Object.keys(cache).forEach((key) => {
    if (now - cache[key].timestamp > TTL) {
      delete cache[key];
      cleaned = true;
    }
  });
  if (cleaned) saveCache();

  return cache;
}

function saveCache() {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

// Generate cache key from input
function hashInput(input) {
  // Normalize: lowercase, trim, remove extra spaces
  const normalized = input.toLowerCase().trim().replace(/\s+/g, ' ');
  return crypto.createHash('md5').update(normalized).digest('hex').slice(0, 12);
}

// Check cache
function get(input) {
  const data = loadCache();
  const key = hashInput(input);
  const entry = data[key];

  if (entry && Date.now() - entry.timestamp < TTL) {
    entry.hits = (entry.hits || 0) + 1;
    entry.lastAccessed = Date.now();
    saveCache();
    return entry.response;
  }

  return null;
}

// Save to cache
function set(input, response) {
  const data = loadCache();
  const key = hashInput(input);

  data[key] = {
    input: input.slice(0, 200),
    response: response.slice(0, 500),
    timestamp: Date.now(),
    lastAccessed: Date.now(),
    hits: 1,
  };

  // Limit cache size
  const keys = Object.keys(data);
  if (keys.length > MAX_CACHE) {
    // Remove least recently accessed
    const sorted = keys.sort(
      (a, b) => (data[a].lastAccessed || 0) - (data[b].lastAccessed || 0)
    );
    sorted.slice(0, keys.length - MAX_CACHE).forEach((k) => delete data[k]);
  }

  saveCache();
}

// Get cache stats
function getStats() {
  const data = loadCache();
  const keys = Object.keys(data);
  const totalHits = keys.reduce((sum, k) => sum + (data[k].hits || 0), 0);

  return {
    entries: keys.length,
    maxEntries: MAX_CACHE,
    totalHits,
    avgHits: keys.length > 0 ? Math.round(totalHits / keys.length) : 0,
    ttlMinutes: TTL / 60000,
  };
}

// Clear cache
function clear() {
  cache = {};
  saveCache();
}

module.exports = { get, set, getStats, clear };
