'use strict';

require('dotenv').config();

const queue = require('./utils/task_queue');
const { runTask } = require('./agent/task_planner');

const POLL_INTERVAL = 5000; // cek queue tiap 5 detik

console.log('[daemon] SI BABU Daemon started');
console.log('[daemon] PID:', process.pid);
console.log('[daemon] Watching task queue...');

// Simpan PID biar bisa di-kill
const fs = require('fs');
const path = require('path');
fs.writeFileSync(path.resolve(__dirname, 'daemon.pid'), String(process.pid));

let isRunning = false;

async function processQueue() {
  if (isRunning) return;

  const pending = queue.getPending();
  if (pending.length === 0) return;

  isRunning = true;
  const task = pending[0];

  try {
    await runTask(task.id);
  } catch (err) {
    console.error('[daemon] Error:', err.message);
  }

  isRunning = false;
}

// Poll queue
setInterval(processQueue, POLL_INTERVAL);
processQueue(); // jalanin langsung pertama kali

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('[daemon] Stopping...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[daemon] Stopping...');
  process.exit(0);
});
