'use strict';

const AgentBase = require('../AgentBase');
const MAX_ATTEMPTS = 3;

class ProjectManagerAgent extends AgentBase {
  constructor({ architect, researcher, builder, qa }) {
    super({
      id: 'pm',
      role: 'PM',
      model: 'meta/llama-3.3-70b-instruct',
      personality:
        'Kamu adalah Project Manager senior. Breakdown task dengan detail. Standar: production-ready. Gunakan bahasa Indonesia tegas.',
    });
    this.architect = architect;
    this.researcher = researcher;
    this.builder = builder;
    this.qa = qa;
  }

  async planTask(taskDesc) {
    this.say(`Task masuk: "${taskDesc}"`);
    let plan;
    try {
      const raw = await this.think(
        `Breakdown task jadi subtasks.\n\nTASK: ${taskDesc}\n\nJawab HANYA JSON murni:\n{"needsResearch":true,"needsArchitect":true,"subtasks":[{"id":1,"desc":"deskripsi spesifik"}],"successCriteria":"kriteria"}`,
        { maxTokens: 500, temperature: 0.1 }
      );
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('No JSON');
      plan = JSON.parse(match[0]);
      if (!Array.isArray(plan.subtasks) || !plan.subtasks.length)
        throw new Error('subtasks kosong');
    } catch (err) {
      this.say(`Fallback plan: ${err.message}`);
      plan = {
        needsResearch: true,
        needsArchitect: false,
        subtasks: [{ id: 1, desc: taskDesc }],
      };
    }
    this.say(`Plan siap: ${plan.subtasks.length} subtask(s)`);
    return plan;
  }

  async run(taskDesc) {
    const plan = await this.planTask(taskDesc);
    let architecture = '',
      research = '';
    const allFiles = [];
    let anyApproved = false;

    if (plan.needsArchitect) {
      this.say('Minta Architect...');
      try {
        const r = await this.architect.work({ desc: taskDesc });
        architecture = r.output || '';
      } catch (err) {
        this.say(`Architect error: ${err.message}`);
      }
    }

    if (plan.needsResearch) {
      this.say('Minta Researcher...');
      try {
        const r = await this.researcher.work({ desc: taskDesc, architecture });
        research = r.output || '';
      } catch (err) {
        this.say(`Researcher error: ${err.message}`);
      }
    }

    for (const subtask of plan.subtasks) {
      this.say(
        `── Subtask ${subtask.id}/${plan.subtasks.length}: "${subtask.desc}"`
      );
      let attempts = 0,
        approved = false,
        lastFeedback = '';

      while (attempts < MAX_ATTEMPTS && !approved) {
        let buildResult;
        try {
          buildResult = await this.builder.work({
            desc: subtask.desc,
            architecture,
            research,
            attempts,
            feedback: lastFeedback,
          });
        } catch (err) {
          this.say(`Builder exception: ${err.message}`);
          attempts++;
          continue;
        }

        if (!buildResult.ok) {
          this.say(`Builder gagal: ${buildResult.error}`);
          attempts++;
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }
        if (buildResult.savedFiles?.length)
          allFiles.push(...buildResult.savedFiles);

        let qaResult;
        try {
          qaResult = await this.qa.review(
            { desc: subtask.desc, attempts },
            buildResult.output
          );
        } catch (err) {
          this.say(`QA exception: ${err.message}`);
          qaResult = { approved: true, score: 7, issues: '' };
        }

        if (qaResult.approved) {
          this.say(
            `✅ Subtask ${subtask.id} APPROVED! (Score: ${qaResult.score}/10)`
          );
          approved = true;
          anyApproved = true;
        } else {
          lastFeedback = qaResult.issues || 'QA tidak puas';
          this.say(`📢 QA REJECT: ${lastFeedback.slice(0, 100)}...`);
          this.builder.receive(
            'QA',
            `REJECTED: ${lastFeedback}\nTolong perbaiki.`
          );
          this.architect.receive(
            'QA',
            `REJECTED: ${lastFeedback}\nRevisi arsitektur.`
          );
          attempts++;
          if (attempts >= MAX_ATTEMPTS) {
            if (buildResult.savedFiles?.length) {
              this.say('⚠️ Max attempts, pakai hasil terakhir.');
              anyApproved = true;
            } else {
              this.say('❌ Max attempts, subtask GAGAL.');
            }
          } else {
            this.say(`🔄 Revisi attempt ${attempts + 1}...`);

            // Gelar RAPAT DEBAT!
            this.say('📢 GELAR RAPAT DEBAT: Semua agent diskusi!');
            const allAgents = [
              this,
              this.architect,
              this.builder,
              this.qa,
              this.researcher,
            ].filter((a) => a && a.id);
            const topic = `QA REJECT hasil build. Issues: ${lastFeedback}. Gimana cara fix-nya?`;
            await this.debateRound(allAgents, topic, 3);

            // Minta Architect revisi
            try {
              const ar = await this.architect.work({
                desc:
                  subtask.desc +
                  ' (REVISI: ' +
                  lastFeedback.slice(0, 100) +
                  ')',
                context: lastFeedback,
              });
              if (ar.output) architecture = ar.output;
            } catch {}
          }
        }
      }
    }

    const uniqueFiles = [...new Set(allFiles)];
    this.say(
      `🎉 Selesai! ${uniqueFiles.length} file: ${uniqueFiles.join(', ')}`
    );
    return {
      ok: true,
      approved: anyApproved,
      savedFiles: uniqueFiles,
      output: `Selesai dengan ${uniqueFiles.length} file`,
    };
  }
}

module.exports = ProjectManagerAgent;
