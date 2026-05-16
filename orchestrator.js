'use strict';

const logger = require('./utils/logger');
const classifier = require('./utils/classifier');
const state = require('./utils/state');
const validator = require('./utils/validator');
const stop = require('./utils/stop');
const continuation = require('./utils/continuation');
const memory = require('./utils/memory_engine');
const decider = require('./agent/roles/decider');

const MAX_STEP = 10;
const MAX_RETRY = 2;
const DECIDER_CONFIDENCE_THRESHOLD = 0.75;

async function run(input, ctx = {}) {
  logger.track('requests');
  logger.info(`[request] "${input.slice(0, 60)}"`);

  stop.init();
  memory.updateUserProfile(input);
  const memData = memory.loadMemory();
  const relevant = memory.retrieveRelevant(input);
  const profile = memData.profile;
  const skill = memory.findSkill(input);

  // ── STEP 1: Classifier ─────────────────────────────────
  const classifierResult = classifier.classify(input);
  log(`[classifier] ${classifierResult}`);

  // ── STEP 2: Decider ────────────────────────────────────
  const recentHistory = memData.short
    .slice(-3)
    .map((m) => `user: ${m.input}\nsi babu: ${m.output?.slice(0, 100)}`)
    .join('\n');

  let finalIntent = classifierResult;
  let shouldBrowse = false;

  try {
    const decision = await decider.decide(
      input,
      recentHistory,
      classifierResult
    );
    log(
      `[decider] intent=${decision.intent} browse=${decision.should_browse} conf=${decision.confidence}`
    );

    if (decision.confidence >= DECIDER_CONFIDENCE_THRESHOLD) {
      finalIntent = decision.intent;
      shouldBrowse = decision.should_browse;
    }
  } catch (err) {
    log(`[decider] error: ${err.message}, fallback ke classifier`);
    finalIntent = classifierResult;
  }

  log(`[intent] final=${finalIntent} | browse=${shouldBrowse}`);

  // ── STEP 3: Route ──────────────────────────────────────
  if (finalIntent === 'chat') {
    const chatter = require('./agent/roles/chatter');
    let result;
    try {
      result = await chatter.run({
        input,
        tone: profile.tone,
        memoryRelevant: relevant,
        shouldBrowse,
      });
    } catch {
      result = { ok: true, output: 'ada yang bisa gue bantu? 😄' };
    }
    memory.saveShortTerm(input, result.output);
    return { success: true, output: result.output, steps: [], error: null };
  }

  // ── STEP 4: Pipeline (untuk task non-chat) ──────────────
  const task = state.init(input);
  task.type = finalIntent;
  state.save(task);

  let pipeline;
  try {
    pipeline = require(`./agent/pipeline/${finalIntent}`);
  } catch {
    const chatter = require('./agent/roles/chatter');
    const result = await chatter.run({
      input,
      tone: profile.tone,
      memoryRelevant: relevant,
    });
    memory.saveShortTerm(input, result.output);
    return { success: true, output: result.output, steps: [], error: null };
  }

  const roles = pipeline.getRoles().filter((roleName) => {
    try {
      return typeof require(`./agent/roles/${roleName}`).run === 'function';
    } catch {
      return false;
    }
  });

  if (!roles.length) return fail(task, 'Semua role tidak tersedia.');

  log(`Pipeline: ${roles.join(' → ')}`);

  const stepLog = [];
  let context = {
    input,
    history: ctx.history || [],
    memoryRelevant: relevant,
    skillMatch: skill,
    tone: profile.tone,
    profile,
    shouldBrowse,
  };
  let stepCount = 0;

  for (const roleName of roles) {
    if (stop.shouldStop(stepCount, MAX_STEP))
      return fail(task, 'Max step tercapai.', stepLog);

    let roleResult = null;
    let attempt = 0;

    while (attempt <= MAX_RETRY) {
      attempt++;
      stepCount++;
      log(`[${stepCount}] ${roleName} (attempt ${attempt})`);

      try {
        roleResult = await require(`./agent/roles/${roleName}`).run(
          context,
          task
        );
      } catch (err) {
        roleResult = { ok: false, error: err.message };
      }

      const valid = validator.validate(roleResult, roleName);
      stepLog.push({
        role: roleName,
        ok: valid.ok,
        summary: valid.summary,
        attempt,
        savedFiles: roleResult?.savedFiles || [],
      });

      if (valid.ok) break;
      if (attempt > MAX_RETRY) {
        return {
          success: false,
          error: `Role "${roleName}" gagal: ${valid.reason}`,
          steps: stepLog,
          output: null,
        };
      }
      log(`  Retry ${attempt}/${MAX_RETRY}: ${valid.reason}`);
    }

    context.prev = roleResult;
    task.lastRole = roleName;
    task.lastOutput = roleResult.output || '';
    state.save(task);
  }

  const finalOutput = continuation.process(task.lastOutput || '');
  task.status = 'done';
  state.save(task);

  memory.saveShortTerm(input, finalOutput);
  memory.saveSkill(task, { steps: stepLog, output: finalOutput });
  memory.saveLongTerm({
    type: finalIntent,
    content: finalOutput.slice(0, 1000),
    tags: [finalIntent, ...input.split(' ').slice(0, 3)],
    source: 'agent',
  });

  const savedFiles = stepLog
    .filter((s) => s.role === 'builder')
    .flatMap((s) => s.savedFiles || []);
  return {
    success: true,
    output: finalOutput,
    steps: stepLog,
    savedFiles,
    error: null,
  };
}

function fail(task, error, steps = []) {
  if (task) {
    task.status = 'failed';
    state.save(task);
  }
  log(`FAIL: ${error}`);
  return { success: false, error, steps, output: null };
}

function log(msg) {
  if (process.env.DEBUG || process.env.VERBOSE)
    console.log(`[orchestrator] ${msg}`);
}

module.exports = { run };
