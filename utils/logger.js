'use strict';

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.resolve(__dirname, '../logs');
const LOG_FILE = path.join(LOG_DIR, 'sibabu.log');
const MAX_SIZE = 1 * 1024 * 1024; // 1MB max per file

function ensureDir() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}

function timestamp() {
  return new Date().toISOString();
}

function rotate() {
  try {
    if (!fs.existsSync(LOG_FILE)) return;
    const size = fs.statSync(LOG_FILE).size;
    if (size > MAX_SIZE) {
      fs.renameSync(LOG_FILE, LOG_FILE + '.old');
    }
  } catch {}
}

function write(level, ...args) {
  const msg = args
    .map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a)))
    .join(' ');
  const line = `[${timestamp()}] [${level.toUpperCase().padEnd(5)}] ${msg}\n`;

  // Console output
  if (level === 'error') process.stderr.write(line);
  else if (process.env.DEBUG || level === 'warn') process.stdout.write(line);

  // File output
  try {
    ensureDir();
    rotate();
    fs.appendFileSync(LOG_FILE, line);
  } catch {}
}

// Stats tracking
const stats = {
  requests: 0,
  errors: 0,
  buildCount: 0,
  chatCount: 0,
  reactCount: 0,
  startTime: Date.now(),
};

function track(event) {
  stats[event] = (stats[event] || 0) + 1;
}

function getStats() {
  const uptime = Math.floor((Date.now() - stats.startTime) / 1000);
  return { ...stats, uptime: `${uptime}s` };
}

const logger = {
  info: (...args) => write('info', ...args),
  warn: (...args) => write('warn', ...args),
  error: (...args) => write('error', ...args),
  debug: (...args) => {
    if (process.env.DEBUG) write('debug', ...args);
  },
  track,
  getStats,
  LOG_FILE,
};

module.exports = logger;
