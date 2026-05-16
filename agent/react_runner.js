'use strict';

const { think } = require('./roles/thinker');
const { executeAction } = require('./core/tool_executor');

const MAX_STEPS = 6;

function isMathQuery(input) {
  return /[0-9].*[+\-*\/^%].*[0-9]|hitung|kalikan|tambah|kurang|bagi|persen|%/i.test(
    input
  );
}

async function tryMath(input) {
  try {
    const { loadPlugins } = require('../tools/plugin_loader');
    const plugins = loadPlugins();

    if (!plugins.calculator) return null;

    const mathMatch = input.match(/[\d\s+\-*\/().^%]+/)?.[0]?.trim();

    const percentMatch = input.match(
      /(\d+(?:\.\d+)?)\s*%\s*(?:dari|of)?\s*(\d+(?:\.\d+)?)/i
    );

    if (percentMatch) {
      return plugins.calculator.run(
        `${percentMatch[1]} / 100 * ${percentMatch[2]}`
      );
    }

    if (mathMatch && /\d/.test(mathMatch)) {
      const expr = mathMatch
        .replace(/\^/g, '**')
        .replace(/x/gi, '*');

      return plugins.calculator.run(expr);
    }

    return null;
  } catch {
    return null;
  }
}

async function summarizeAnswer(input, raw) {
  try {
    const provider = require('../provider/router');

    return await provider.call(
      `Jawab pertanyaan user dengan natural, singkat, santai, dan jelas.

PERTANYAAN:
${input}

DATA:
${raw.slice(0, 1500)}

JAWABAN:`,
      {
        maxTokens: 180,
        temperature: 0.3,
      }
    );
  } catch {
    return raw.slice(0, 300);
  }
}

async function buildObservationAnswer(input, observations) {
  try {
    const provider = require('../provider/router');

    const obsText = observations
      .map(
        (o, i) =>
          `[${i + 1}] ${o.action}(${o.input})\n${o.result.slice(0, 500)}`
      )
      .join('\n\n');

    return await provider.call(
      `Jawab berdasarkan hasil observasi berikut.

ATURAN:
- Natural
- Jangan terlalu formal
- Jangan ngarang
- Langsung ke poin

PERTANYAAN:
${input}

OBSERVASI:
${obsText}

JAWABAN:`,
      {
        maxTokens: 220,
        temperature: 0.2,
      }
    );
  } catch {
    return 'Gue belum nemu jawaban yang valid.';
  }
}

async function runReAct(input) {
  const observations = [];

  const mathResult = await tryMath(input);

  if (mathResult) {
    return {
      answer: String(mathResult),
      observations: [],
    };
  }

  let finalAnswer = null;

  for (let step = 0; step < MAX_STEPS; step++) {
    const decision = await think({
      input,
      observations,
    });

    if (!decision.ok) break;

    if (process.env.DEBUG) {
      console.log(
        `[react] ${decision.action}: ${decision.input}`
      );
    }

    if (decision.action === 'finish') {
      const raw =
        typeof decision.input === 'string'
          ? decision.input.trim()
          : JSON.stringify(decision.input);

      if (
        raw.length < 200 &&
        !raw.includes('\n\n')
      ) {
        finalAnswer = raw;
      } else {
        finalAnswer = await summarizeAnswer(
          input,
          raw
        );
      }

      break;
    }

    let result;

    try {
      result = await executeAction(
        decision.action,
        decision.input
      );
    } catch (err) {
      result = `Error: ${err.message}`;
    }

    observations.push({
      action: decision.action,
      input: decision.input,
      result: String(result).slice(0, 1000),
    });
  }

  if (!finalAnswer && observations.length) {
    finalAnswer = await buildObservationAnswer(
      input,
      observations
    );
  }

  return {
    answer:
      finalAnswer ||
      'Maaf, gue belum bisa nemuin jawabannya.',
    observations,
  };
}

module.exports = {
  runReAct,
};
