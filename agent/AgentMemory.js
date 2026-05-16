'use strict';

const fs = require('fs');
const path = require('path');

const MEM_DIR = path.resolve(__dirname, '../memory');

class AgentMemory {
  constructor(agentId) {
    this.agentId = agentId;
    this.memFile = path.join(MEM_DIR, `${agentId}_memory.json`);
    this._ensureDir();
    this._data = this._load();
  }

  _ensureDir() {
    if (!fs.existsSync(MEM_DIR)) fs.mkdirSync(MEM_DIR, { recursive: true });
  }

  _load() {
    try {
      if (!fs.existsSync(this.memFile)) return this._default();
      const raw = fs.readFileSync(this.memFile, 'utf8').trim();
      if (!raw) return this._default();
      return JSON.parse(raw);
    } catch {
      return this._default();
    }
  }

  _default() {
    return {
      agentId: this.agentId,
      shortTerm: [],
      longTerm: [],
      currentTask: null,
      stats: { tasksCompleted: 0, tasksRejected: 0, totalAttempts: 0 },
    };
  }

  _save() {
    try {
      fs.writeFileSync(
        this.memFile,
        JSON.stringify(this._data, null, 2),
        'utf8'
      );
    } catch (err) {
      console.error(`[AgentMemory] Gagal simpan ${this.agentId}:`, err.message);
    }
  }

  addMessage(from, message) {
    this._data.shortTerm.push({
      from,
      message: message.slice(0, 500),
      ts: Date.now(),
    });
    if (this._data.shortTerm.length > 20)
      this._data.shortTerm = this._data.shortTerm.slice(-20);
    this._save();
  }

  setCurrentTask(task) {
    this._data.currentTask = {
      id: task.id || Date.now().toString(),
      desc: task.desc || '',
      status: 'working',
      attempts: 0,
      feedback: [],
      startedAt: new Date().toISOString(),
    };
    this._save();
  }

  incrementAttempt(feedback = '') {
    if (!this._data.currentTask) return;
    this._data.currentTask.attempts++;
    this._data.stats.totalAttempts++;
    if (feedback)
      this._data.currentTask.feedback.push({
        attempt: this._data.currentTask.attempts,
        feedback: feedback.slice(0, 300),
        ts: Date.now(),
      });
    this._save();
  }

  completeTask(result = '') {
    if (!this._data.currentTask) return;
    this._data.currentTask.status = 'approved';
    this._data.longTerm.push({
      task: this._data.currentTask.desc?.slice(0, 100),
      attempts: this._data.currentTask.attempts,
      feedback: this._data.currentTask.feedback,
      result: result.slice(0, 300),
      ts: Date.now(),
    });
    if (this._data.longTerm.length > 50)
      this._data.longTerm = this._data.longTerm.slice(-50);
    this._data.stats.tasksCompleted++;
    this._data.currentTask = null;
    this._save();
  }

  failTask() {
    if (!this._data.currentTask) return;
    this._data.currentTask.status = 'failed';
    this._data.stats.tasksRejected++;
    this._data.currentTask = null;
    this._save();
  }

  getContext() {
    const recent = this._data.shortTerm
      .slice(-8)
      .map((m) => `[${m.from}]: ${m.message}`)
      .join('\n');
    const lessons = this._data.longTerm
      .slice(-3)
      .map(
        (l) =>
          `- Task "${l.task}" (${l.attempts} attempts): ${l.result?.slice(0, 100)}`
      )
      .join('\n');
    return {
      recent,
      lessons,
      currentTask: this._data.currentTask,
      stats: this._data.stats,
    };
  }

  resetSession() {
    this._data.shortTerm = [];
    this._data.currentTask = null;
    this._save();
  }
  get stats() {
    return this._data.stats;
  }
  get currentTask() {
    return this._data.currentTask;
  }
}

module.exports = AgentMemory;
