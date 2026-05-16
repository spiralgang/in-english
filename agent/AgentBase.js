'use strict';

const AgentMemory = require('./AgentMemory');
const provider = require('../provider/router');

class AgentBase {
  constructor({ id, role, model, color, personality }) {
    this.id = id;
    this.role = role;
    this.model = model;
    this.color = color;
    this.personality = personality;
    this.memory = new AgentMemory(id);
    this._onMessage = null;
  }

  onMessage(fn) {
    this._onMessage = fn;
  }

  say(message) {
    if (this._onMessage) {
      this._onMessage({
        agentId: this.id,
        role: this.role,
        color: this.color,
        message,
        ts: Date.now(),
      });
    }
    this.memory.addMessage(this.role, message);
  }

  receive(fromRole, message) {
    this.memory.addMessage(fromRole, message);
  }

  async think(prompt, opts = {}) {
    const ctx = this.memory.getContext();

    // Batasi context yang diinject biar tidak overflow
    const recentSlice = (ctx.recent || '').slice(0, 300);
    const lessonsSlice = (ctx.lessons || '').slice(0, 200);
    const taskDesc = ctx.currentTask?.desc?.slice(0, 100) || '';
    const attempt = ctx.currentTask?.attempts ?? 0;
    const lastFeedback =
      ctx.currentTask?.feedback?.slice(-1)[0]?.feedback?.slice(0, 200) || '';

    const systemPrompt = [
      this.personality,
      recentSlice ? `\nKonteks terakhir:\n${recentSlice}` : '',
      lessonsSlice ? `\nPelajaran sebelumnya:\n${lessonsSlice}` : '',
      taskDesc ? `\nTask: ${taskDesc} (attempt ${attempt + 1})` : '',
      lastFeedback ? `\nFeedback sebelumnya: ${lastFeedback}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    return await provider.call(prompt, {
      model: this.model,
      systemPrompt,
      maxTokens: opts.maxTokens || 2000,
      temperature: opts.temperature ?? 0.7,
    });
  }

  // 💬 Diskusi antar agent
  async discussWith(agent, topic, opts = {}) {
    const prompt = `Kamu adalah ${this.role} di tim AI.
Konteks tim: ${this.memory.getContext().recent || 'baru mulai'}

TOPIK DISKUSI: ${topic}

Rules:
- Ngomong natural kayak kolega profesional, BUKAN template
- Kalau setuju → bilang setuju + alasan singkat
- Kalau tidak setuju → bilang kenapa + kasih alternatif konkret
- Boleh kritik, tapi tetap profesional
- Jawab 1-4 kalimat aja, langsung ke poin

Pesan untuk ${agent.role}:`;

    const response = await this.think(prompt, {
      maxTokens: opts.maxTokens || 300,
      temperature: 0.7,
    });
    agent.receive(this.role, response);
    return { from: this.role, to: agent.role, message: response };
  }

  // 🎯 Round table debate — semua agent debat bareng
  async debateRound(allAgents, topic, maxRounds = 3) {
    const conversation = [];

    for (let round = 0; round < maxRounds; round++) {
      this.say(`💬 ROUND ${round + 1}/${maxRounds}`);

      for (const agent of allAgents) {
        if (agent.id === this.id) continue; // skip diri sendiri

        const context = conversation
          .slice(-6)
          .map((c) => `[${c.from}]: ${c.message}`)
          .join('\n');

        const prompt = `Kamu adalah ${agent.role} di tim AI. Lagi rapat bahas: ${topic}

KONTEKS DEBAT:
${context || 'Baru mulai'}

TUGAS LO:
- Evaluasi hasil kerja Builder: apa yang udah bagus, apa yang kurang
- Kalau QA protes → bela pendapat lo dengan alasan teknis
- Kalau PM minta revisi → jelasin effort yang dibutuhkan
- Kalau Researcher nemu data baru → kasih tau
- Jangan cuma bilang "setuju" — kasih argumen!
- Natural kayak Slack/Huddle, BUKAN template

Jawab sebagai ${agent.role}:`;

        try {
          const response = await agent.think(prompt, {
            maxTokens: 250,
            temperature: 0.8,
          });
          agent.receive(this.role, response);
          conversation.push({ from: agent.role, message: response });
          this.say(`${agent.role}: ${response.slice(0, 150)}`);
        } catch (err) {
          conversation.push({
            from: agent.role,
            message: `[${agent.role} timeout]`,
          });
        }
      }

      // Cek apakah udah ada kesepakatan
      const lastMsgs = conversation
        .slice(-3)
        .map((c) => c.message.toLowerCase())
        .join(' ');
      if (
        lastMsgs.includes('setuju') ||
        lastMsgs.includes('approved') ||
        lastMsgs.includes('ok')
      ) {
        this.say('✅ Debat selesai — ada kesepakatan!');
        break;
      }
    }

    return conversation;
  }

  async work(task) {
    throw new Error(`${this.role}.work() belum diimplementasi`);
  }
}

module.exports = AgentBase;
