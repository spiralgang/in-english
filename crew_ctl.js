'use strict';

// crew_ctl.js — control crew daemon dari CLI
// Usage: node crew_ctl.js start|stop|status|add "task desc"

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PID_FILE = path.resolve(__dirname, 'crew_daemon.pid');
const QUEUE_FILE = path.resolve(__dirname, 'memory/crew_queue.json');
const LOG_FILE = path.resolve(__dirname, 'crew_daemon.log');

const c = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

function isRunning() {
  if (!fs.existsSync(PID_FILE)) return false;
  try {
    const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim());
    process.kill(pid, 0);
    return pid;
  } catch {
    return false;
  }
}

function loadQueue() {
  try {
    if (!fs.existsSync(QUEUE_FILE)) return [];
    return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function addTask(desc) {
  if (!fs.existsSync(path.dirname(QUEUE_FILE))) {
    fs.mkdirSync(path.dirname(QUEUE_FILE), { recursive: true });
  }
  const q = loadQueue();
  const task = {
    id: Date.now().toString(),
    desc,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  q.push(task);
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(q, null, 2));
  return task;
}

const cmd = process.argv[2];
const arg = process.argv.slice(3).join(' ');

switch (cmd) {
case 'start': {
  const pid = isRunning();
  if (pid) {
    console.log(`${c.yellow}Crew daemon udah jalan (PID: ${pid})${c.reset}`);
  } else {
    exec(
      `nohup node ${path.resolve(__dirname, 'crew_daemon.js')} >> ${LOG_FILE} 2>&1 &`,
      (err) => {
        if (err)
          console.error(`${c.red}Gagal start: ${err.message}${c.reset}`);
        else
          console.log(
            `${c.green}✅ Crew daemon started! Log: crew_daemon.log${c.reset}`
          );
      }
    );
  }
  break;
}

case 'stop': {
  const pid = isRunning();
  if (!pid) {
    console.log(`${c.yellow}Daemon tidak berjalan${c.reset}`);
  } else {
    process.kill(pid, 'SIGTERM');
    console.log(`${c.green}✅ Daemon stopped (PID: ${pid})${c.reset}`);
  }
  break;
}

case 'status': {
  const pid = isRunning();
  console.log(`\n${c.bold}── Crew Daemon ──────────────${c.reset}`);
  console.log(
    `Status : ${pid ? `${c.green}RUNNING (PID: ${pid})` : `${c.red}STOPPED`}${c.reset}`
  );

  const q = loadQueue();
  const pending = q.filter((t) => t.status === 'pending').length;
  const running = q.filter((t) => t.status === 'running').length;
  const done = q.filter((t) => t.status === 'done').length;
  const failed = q.filter((t) => t.status === 'failed').length;

  console.log(
    `Queue  : ${pending} pending, ${running} running, ${done} done, ${failed} failed`
  );

  if (q.length > 0) {
    console.log(`\n${c.bold}Tasks:${c.reset}`);
    q.slice(-5).forEach((t) => {
      const icon =
          { pending: '⏳', running: '⚙️ ', done: '✅', failed: '❌' }[
            t.status
          ] || '?';
      console.log(
        `  ${icon} [${t.status.toUpperCase()}] ${t.desc.slice(0, 50)}`
      );
      if (t.savedFiles?.length) {
        console.log(
          `     ${c.dim}Files: ${t.savedFiles.join(', ')}${c.reset}`
        );
      }
    });
  }
  console.log();
  break;
}

case 'add': {
  if (!arg) {
    console.log(
      `${c.red}Usage: node crew_ctl.js add "task description"${c.reset}`
    );
    break;
  }
  const task = addTask(arg);
  console.log(
    `${c.green}✅ Task ditambah ke queue (ID: ${task.id})${c.reset}`
  );
  console.log(`${c.dim}  "${arg}"${c.reset}`);

  const pid = isRunning();
  if (!pid) {
    console.log(
      `${c.yellow}⚠️  Daemon belum jalan. Jalankan: node crew_ctl.js start${c.reset}`
    );
  }
  break;
}

case 'log': {
  if (!fs.existsSync(LOG_FILE)) {
    console.log('Log kosong');
    break;
  }
  const lines = fs.readFileSync(LOG_FILE, 'utf8').split('\n').slice(-30);
  console.log(lines.join('\n'));
  break;
}

default:
  console.log(`
${c.bold}Crew Control${c.reset}
  node crew_ctl.js start          — start daemon background
  node crew_ctl.js stop           — stop daemon
  node crew_ctl.js status         — lihat status & queue
  node crew_ctl.js add "task"     — tambah task ke queue
  node crew_ctl.js log            — lihat log terakhir
`);
}
