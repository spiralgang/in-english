'use strict';

const fs = require('fs');
const path = require('path');

const QUEUE_FILE = path.resolve(__dirname, '../memory/task_queue.json');

function load() {
  try {
    if (!fs.existsSync(QUEUE_FILE)) return [];
    return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function save(tasks) {
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(tasks, null, 2));
}

function addTask(task) {
  const tasks = load();
  const newTask = {
    id: Date.now().toString(),
    input: task.input,
    subtasks: task.subtasks || [],
    status: 'pending', // pending | running | done | failed
    progress: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    result: null,
    error: null,
  };
  tasks.push(newTask);
  save(tasks);
  return newTask;
}

function updateTask(id, updates) {
  const tasks = load();
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  tasks[idx] = {
    ...tasks[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  save(tasks);
  return tasks[idx];
}

function getTask(id) {
  return load().find((t) => t.id === id) || null;
}

function getPending() {
  return load().filter((t) => t.status === 'pending' || t.status === 'running');
}

function clearDone() {
  const tasks = load().filter((t) => t.status !== 'done');
  save(tasks);
}

module.exports = { addTask, updateTask, getTask, getPending, load, clearDone };
