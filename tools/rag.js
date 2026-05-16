'use strict';

const fs = require('fs');
const path = require('path');
const { similarity, saveShortTerm } = require('../utils/memory_engine');

const RAG_FILE = path.resolve(__dirname, '../memory/knowledge.json');
const CHUNK_SIZE = 500; // karakter per chunk

// ─── Baca file ────────────────────────────────────────────────────────
async function readDocument(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const PROJECT_ROOT = path.resolve(__dirname, '..');
  let abs = path.resolve(PROJECT_ROOT, filePath);
  if (!fs.existsSync(abs)) abs = path.resolve(filePath);
  if (!fs.existsSync(abs))
    abs = path.resolve(process.env.HOME || '.', filePath);

  if (!fs.existsSync(abs))
    return { ok: false, error: `File tidak ditemukan: ${filePath}` };

  try {
    if (ext === '.pdf') {
      const pdfParse = require('pdf-parse');
      const buffer = fs.readFileSync(abs);
      const data = await pdfParse(buffer);
      return { ok: true, content: data.text, ext };
    }
    const content = fs.readFileSync(abs, 'utf8');
    return { ok: true, content, ext };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ─── Potong jadi chunks ───────────────────────────────────────────────
function chunkText(text, size = CHUNK_SIZE) {
  const chunks = [];
  const sentences = text.split(/(?<=[.!?\n])\s+/);
  let current = '';

  for (const sentence of sentences) {
    if ((current + sentence).length > size && current.length > 0) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += ' ' + sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

// ─── Simpan dokumen ke knowledge base ────────────────────────────────
async function ingestDocument(filePath, label = '') {
  const result = await readDocument(filePath);
  if (!result.ok) return result;

  const chunks = chunkText(result.content);
  const existing = loadKnowledge();
  const docLabel = label || path.basename(filePath);

  // Hapus chunk lama dari dokumen yang sama
  const filtered = existing.filter((c) => c.source !== docLabel);

  const newChunks = chunks.map((text, i) => ({
    id: `${docLabel}_${i}`,
    source: docLabel,
    text,
    ts: Date.now(),
  }));

  const updated = [...filtered, ...newChunks];
  fs.writeFileSync(RAG_FILE, JSON.stringify(updated, null, 2));

  return { ok: true, chunks: newChunks.length, source: docLabel };
}

// ─── Load knowledge base ──────────────────────────────────────────────
function loadKnowledge() {
  try {
    if (!fs.existsSync(RAG_FILE)) return [];
    return JSON.parse(fs.readFileSync(RAG_FILE, 'utf8'));
  } catch {
    return [];
  }
}

// ─── Cari chunk yang relevan ──────────────────────────────────────────
function retrieve(query, maxChunks = 3) {
  const knowledge = loadKnowledge();
  if (knowledge.length === 0) return [];

  return knowledge
    .map((chunk) => ({ ...chunk, score: similarity(query, chunk.text) }))
    .filter((c) => c.score > 0.05)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxChunks);
}

// ─── Format untuk prompt ──────────────────────────────────────────────
function formatContext(chunks) {
  if (chunks.length === 0) return '';
  return chunks.map((c) => `[${c.source}]\n${c.text}`).join('\n\n---\n\n');
}

module.exports = { ingestDocument, retrieve, formatContext, loadKnowledge };
