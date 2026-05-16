/**
 * tools/file.js — Operasi file: write, append, read
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function write(filePath, content) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, content, 'utf8');
}

async function append(filePath, content) {
  ensureDir(filePath);
  fs.appendFileSync(filePath, content, 'utf8');
}

async function read(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf8');
}

// Tmp dir yang valid di Termux
const TMP_DIR = os.tmpdir();

module.exports = { write, append, read, TMP_DIR };
