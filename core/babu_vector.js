'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const MEMORY_DIR = path.join(__dirname, '..', 'memory');
const VECTOR_FILE = path.join(MEMORY_DIR, 'vectors.json');

let cache = null;

function getApiKey() {
  try {
    const envFile = path.join(__dirname, '..', '.env');
    if (!fs.existsSync(envFile)) return null;
    const env = fs.readFileSync(envFile, 'utf8');
    const match = env.match(/NVIDIA_API_KEY=(\S+)/);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

function loadVectors() {
  if (cache) return cache;
  try {
    if (!fs.existsSync(MEMORY_DIR))
      fs.mkdirSync(MEMORY_DIR, { recursive: true });
    cache = JSON.parse(fs.readFileSync(VECTOR_FILE, 'utf8'));
  } catch {
    cache = { entries: [] };
  }
  return cache;
}

function saveVectors() {
  if (!fs.existsSync(MEMORY_DIR)) fs.mkdirSync(MEMORY_DIR, { recursive: true });
  fs.writeFileSync(VECTOR_FILE, JSON.stringify(cache, null, 2));
}

// Build vocabulary from all texts
function buildVocab() {
  const words = new Set();
  cache.entries.forEach((e) => {
    e.text
      .toLowerCase()
      .split(/\s+/)
      .forEach((w) => {
        if (w.length >= 2) words.add(w);
      });
  });
  return Array.from(words);
}

// Simple keyword match vector
function makeVector(text, vocab) {
  const words = text.toLowerCase().split(/\s+/);
  const vec = new Array(vocab.length).fill(0);
  vocab.forEach((word, i) => {
    if (words.includes(word)) vec[i] = 1;
  });
  return vec;
}

function cosineSimilarity(a, b) {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0,
    magA = 0,
    magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

async function addVector(text, metadata = {}) {
  const data = loadVectors();
  data.entries.push({
    id: crypto.randomBytes(8).toString('hex'),
    text: text.slice(0, 1000),
    metadata,
    timestamp: Date.now(),
  });
  if (data.entries.length > 500) data.entries = data.entries.slice(-500);

  // Rebuild all vectors with latest vocab
  const vocab = buildVocab();
  data.entries.forEach((e) => {
    e.embedding = makeVector(e.text, vocab);
  });

  saveVectors();
  return { count: data.entries.length, vocabSize: vocab.length };
}

async function search(query, limit = 5) {
  const data = loadVectors();
  if (!data.entries.length) return [];

  // Rebuild vocab & vectors
  const vocab = buildVocab();
  data.entries.forEach((e) => {
    e.embedding = makeVector(e.text, vocab);
  });

  const queryVec = makeVector(query, vocab);

  const scored = data.entries.map((e) => ({
    ...e,
    score: cosineSimilarity(queryVec, e.embedding),
  }));

  return scored
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((e) => ({
      text: e.text,
      score: Math.round(e.score * 100),
      metadata: e.metadata,
    }));
}

module.exports = { addVector, search };
