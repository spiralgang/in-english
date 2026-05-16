'use strict';

const fs = require('fs');
const path = require('path');

// Root yang boleh diakses — home Termux
const ALLOWED_ROOT = process.env.HOME || '/data/data/com.termux/files/home';

function safePath(inputPath) {
  const resolved = path.resolve(inputPath);
  if (!resolved.startsWith(ALLOWED_ROOT)) {
    throw new Error(`Path tidak diizinkan: ${inputPath}`);
  }
  return resolved;
}

// List isi folder
function listDir(dirPath) {
  const safe = safePath(dirPath);
  if (!fs.existsSync(safe)) return { error: `Folder tidak ada: ${dirPath}` };

  const items = fs.readdirSync(safe, { withFileTypes: true });
  return items.map((item) => ({
    name: item.name,
    type: item.isDirectory() ? 'dir' : 'file',
    size: item.isFile() ? fs.statSync(path.join(safe, item.name)).size : null,
  }));
}

// Baca file
function readFile(filePath) {
  const safe = safePath(filePath);
  if (!fs.existsSync(safe)) return { error: `File tidak ada: ${filePath}` };
  const stat = fs.statSync(safe);
  if (stat.size > 100 * 1024) return { error: 'File terlalu besar (>100KB)' };
  return { content: fs.readFileSync(safe, 'utf8') };
}

// Tulis/edit file
function writeFile(filePath, content) {
  const safe = safePath(filePath);
  const dir = path.dirname(safe);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(safe, content, 'utf8');
  return { ok: true, path: filePath };
}

// Hapus file
function deleteFile(filePath) {
  const safe = safePath(filePath);
  if (!fs.existsSync(safe)) return { error: 'File tidak ada' };
  fs.unlinkSync(safe);
  return { ok: true };
}

// Cari file berdasarkan nama
function findFiles(dirPath, pattern) {
  const safe = safePath(dirPath);
  const results = [];
  const re = new RegExp(pattern, 'i');

  function walk(dir, depth = 0) {
    if (depth > 4) return; // max depth
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        if (item.name.startsWith('.')) continue; // skip hidden
        const full = path.join(dir, item.name);
        if (re.test(item.name)) results.push(full.replace(ALLOWED_ROOT, '~'));
        if (item.isDirectory()) walk(full, depth + 1);
      }
    } catch {}
  }

  walk(safe);
  return results.slice(0, 20); // max 20 hasil
}

module.exports = {
  listDir,
  readFile,
  writeFile,
  deleteFile,
  findFiles,
  ALLOWED_ROOT,
};
