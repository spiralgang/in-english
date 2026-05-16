'use strict';

require('dotenv').config();

const fs = require('fs');
const path = require('path');

const QUEUE_FILE = path.resolve(__dirname, 'memory/crew_queue.json');
const PID_FILE = path.resolve(__dirname, 'crew_daemon.pid');
const LOG_FILE = path.resolve(__dirname, 'crew_daemon.log');
const POLL_MS = 3000;

// Simpan PID
fs.writeFileSync(PID_FILE, String(process.pid));

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  process.stdout.write(line);
  fs.appendFileSync(LOG_FILE, line);
}

function loadQueue() {
  try {
    if (!fs.existsSync(QUEUE_FILE)) return [];
    return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveQueue(q) {
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(q, null, 2));
}

function addTask(taskDesc) {
  const q = loadQueue();
  const task = {
    id: Date.now().toString(),
    desc: taskDesc,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  q.push(task);
  saveQueue(q);
  return task;
}

function updateTask(id, updates) {
  const q = loadQueue();
  const idx = q.findIndex((t) => t.id === id);
  if (idx === -1) return;
  q[idx] = { ...q[idx], ...updates, updatedAt: new Date().toISOString() };
  saveQueue(q);
}

let isRunning = false;

async function processQueue() {
  if (isRunning) return;
  const q = loadQueue();
  const pending = q.find((t) => t.status === 'pending');
  if (!pending) return;

  isRunning = true;
  log(`Starting task: ${pending.desc}`);
  updateTask(pending.id, { status: 'running' });

  try {
    const { createCrew } = require('./agent/crew/index');

    const crew = createCrew((msg) => {
      log(`[${msg.role}] ${msg.message.slice(0, 200)}`);
    });

    const result = await crew.pm.run(pending.desc);

    updateTask(pending.id, {
      status: result.ok ? 'done' : 'failed',
      approved: result.approved,
      savedFiles: result.savedFiles || [],
    });

    log(`Task ${result.ok ? 'DONE' : 'FAILED'}: ${pending.desc}`);
    if (result.savedFiles?.length) {
      log(`Files: ${result.savedFiles.join(', ')}`);
    }
  } catch (err) {
    log(`Task ERROR: ${err.message}`);
    updateTask(pending.id, { status: 'failed', error: err.message });
  }

  isRunning = false;
}

log(`Crew Daemon started (PID: ${process.pid})`);
log('Watching crew queue...');

setInterval(processQueue, POLL_MS);
processQueue();

process.on('SIGTERM', () => {
  log('Stopping...');
  fs.unlinkSync(PID_FILE);
  process.exit(0);
});
process.on('SIGINT', () => {
  log('Stopping...');
  fs.unlinkSync(PID_FILE);
  process.exit(0);
});
