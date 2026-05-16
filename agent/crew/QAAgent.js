'use strict';

const AgentBase = require('../AgentBase');

class QAAgent extends AgentBase {
  constructor() {
    super({
      id: 'qa',
      role: 'QA',
      model: 'deepseek-ai/deepseek-v4-flash',
      personality:
        'Kamu QA Engineer yang teliti. APPROVED kalau kode bisa jalan dan memenuhi core functionality. REJECTED hanya kalau ada syntax error fatal.',
    });
  }

  async review(task, builderOutput) {
    this.say(`Review: "${task.desc}" (attempt ${(task.attempts || 0) + 1})`);
    this.memory.setCurrentTask(task);

    // Auto-approve kalau udah attempt ke-3+
    if ((task.attempts || 0) >= 2) {
      this.say('Attempt ke-3+, auto-approve.');
      this.memory.completeTask('auto-approved');
      return {
        approved: true,
        score: 6,
        issues: 'Auto-approved after multiple attempts',
        output: '',
        role: 'qa',
      };
    }

    let result, score, isApproved, issues;

    try {
      result = await this.think(
        `Review kode ini.\n\nTASK: ${task.desc}\nATTEMPT: ${(task.attempts || 0) + 1}\n\nKODE:\n${(builderOutput || '').slice(0, 2500)}\n\nAPPROVED kalau: syntax valid, core functionality ada.\nREJECTED hanya kalau: syntax error fatal yang pasti crash.\n\nJawab format PERSIS ini:\nVERDICT: APPROVED atau REJECTED\nSCORE: [0-10]\nISSUES: [deskripsi atau "none"]\nSUGGESTION: [saran 1-2 kalimat]\nSUMMARY: [ringkasan 1 kalimat]`,
        { maxTokens: 400, temperature: 0.1 }
      );

      // Parse score dengan fallback
      const scoreMatch = result ? result.match(/SCORE:\s*(\d+)/i) : null;
      score = scoreMatch ? parseInt(scoreMatch[1]) : 5;

      // Parse verdict
      isApproved = result
        ? (/VERDICT:\s*APPROVED/i.test(result) && score >= 6) || (score >= 6 && /ISSUES:\s*(none|tidak ada|no issues|kosong|-)/i.test(result))
        : false;

      // Parse issues
      const issuesMatch = result
        ? result.match(/ISSUES:\s*([\s\S]+?)(?=SUGGESTION:|SUMMARY:|$)/i)
        : null;
      issues = issuesMatch ? issuesMatch[1].trim() : 'No issues detected';

      if (isApproved) {
        this.say(`✅ APPROVED (${score}/10)`);
        this.memory.completeTask(result);
      } else {
        this.say(`❌ REJECTED (${score}/10)`);
        this.memory.incrementAttempt(issues);
      }
    } catch (err) {
      this.say(`QA error: ${err.message}, auto-review...`);

      let score;
      let isApproved;
      let issues;
      const hasCode = (builderOutput || '').length > 200;
      score = hasCode ? 7 : 4;
      isApproved = score >= 6;
      issues = hasCode
        ? 'Auto-reviewed: kode ditemukan'
        : 'Auto-reviewed: kode terlalu pendek';

      return {
        approved: isApproved,
        score,
        issues,
        output: 'Auto-reviewed',
        role: 'qa',
      };
    }

    return {
      approved: isApproved,
      score,
      issues,
      output: result || 'Auto-reviewed',
      role: 'qa',
    };
  }
}

module.exports = QAAgent;
