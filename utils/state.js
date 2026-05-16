/**
 * utils/state.js — Handle state task aktif
 * Persist ke memory/tasks.json
 */

'use strict';

const fs = require('fs');
const path = require('path');

const TASKS_FILE = path.resolve(__dirname, '../memory/tasks.json');
const MAX_HISTORY = 50;

let current = null;

function init(input) {
  current = {
    id: Date.now().toString(),
    input,
    type: null,
    status: 'running',
    lastRole: null,
    lastOutput: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  save(current);
  return current;
}

function save(task) {
  current = { ...task, updatedAt: new Date().toISOString() };

  try {
    let history = [];
    if (fs.existsSync(TASKS_FILE)) {
      try {
        history = JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8'));
      } catch {}
    }

    const idx = history.findIndex((t) => t.id === current.id);
    if (idx >= 0) history[idx] = current;
    else history.push(current);

    if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);

    fs.writeFileSync(TASKS_FILE, JSON.stringify(history, null, 2), 'utf8');
  } catch (err) {
    // Non-fatal — state in-memory tetap jalan
    console.error('[state] Gagal persist:', err.message);
  }
}

function getCurrent() {
  return current;
}

module.exports = { init, save, getCurrent };
