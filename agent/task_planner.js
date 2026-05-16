'use strict';

const provider = require('../provider/router');
const queue = require('../utils/task_queue');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = path.resolve(__dirname, '../output');

async function planTask(input) {
  const systemPrompt = `Kamu adalah project manager yang breakdown task kompleks.
Analisis task dan buat sub-tasks yang spesifik dan actionable.
Setiap sub-task harus bisa dikerjakan secara independen.`;

  const prompt = `Task: ${input}

Breakdown jadi sub-tasks yang spesifik. Jawab HANYA JSON:
{
  "projectName": "nama_folder_project",
  "description": "deskripsi singkat",
  "subtasks": [
    {"id": 1, "title": "judul", "prompt": "instruksi detail untuk builder", "type": "build|config|docs"},
    ...
  ]
}`;

  try {
    const raw = await provider.call(prompt, {
      role: 'planner',
      maxTokens: 1000,
      temperature: 0.1,
    });
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON');
    return JSON.parse(match[0]);
  } catch (err) {
    // Fallback: single task
    return {
      projectName: 'project_' + Date.now(),
      description: input,
      subtasks: [{ id: 1, title: input, prompt: input, type: 'build' }],
    };
  }
}

async function executeSubtask(subtask, projectDir, prevResults = '') {
  const provider = require('../provider/router');
  const fileTool = require('../tools/file');
  const path = require('path');

  const prompt = prevResults
    ? `${subtask.prompt}\n\nKonteks dari subtask sebelumnya:\n${prevResults.slice(0, 500)}`
    : subtask.prompt;

  const systemPrompt = `Kamu adalah Senior Software Engineer.
Buat kode yang LENGKAP dan PROFESIONAL.
PENTING: Semua file harus disimpan di folder: ${projectDir}

FORMAT WAJIB:
=== FILE: ${projectDir}/nama_file.js ===
[kode]
=== END FILE ===`;

  let output;
  try {
    output = await provider.call(prompt, {
      systemPrompt,
      role: 'builder',
      maxTokens: 3000,
    });
  } catch (err) {
    throw new Error('Provider error: ' + err.message);
  }

  // Kalau output terpotong
  if (output.includes('=== FILE:') && !output.includes('=== END')) {
    output += '\n=== END FILE ===';
  }

  // Normalisasi
  const normalized = output
    .replace(/===\s*FILE:\s*(.+?)\s*===\n\`\`\`[\w]*\n/g, '=== FILE: $1 ===\n')
    .replace(/\n\`\`\`\n===/g, '\n===');

  const FILE_PATTERN =
    /===\s*FILE:\s*(.+?)\s*===\n([\s\S]+?)===\s*END(?:\s*FILE)?\s*===/g;
  const savedFiles = [];
  let match;

  while ((match = FILE_PATTERN.exec(normalized)) !== null) {
    let filePath = match[1].trim();
    const code = match[2].trim();

    // Pastikan file masuk ke projectDir
    if (!filePath.startsWith('/')) {
      filePath = path.join(projectDir, filePath);
    }

    try {
      await fileTool.write(filePath, code);
      savedFiles.push(filePath);
      console.log('[daemon] Saved:', filePath);
    } catch (err) {
      console.error('[daemon] Failed save:', filePath, err.message);
    }
  }

  return { ok: true, output, savedFiles };
}

async function runTask(taskId) {
  const task = queue.getTask(taskId);
  if (!task) return;

  queue.updateTask(taskId, { status: 'running' });
  console.log(`\n[daemon] Starting task: ${task.input.slice(0, 60)}`);

  try {
    // Plan subtasks kalau belum ada
    let subtasks = task.subtasks;
    if (!subtasks || subtasks.length === 0) {
      console.log('[daemon] Planning subtasks...');
      const plan = await planTask(task.input);
      subtasks = plan.subtasks;

      // Buat output folder
      const projectDir = path.resolve(OUTPUT_DIR, plan.projectName);
      if (!fs.existsSync(projectDir))
        fs.mkdirSync(projectDir, { recursive: true });

      queue.updateTask(taskId, {
        subtasks: subtasks,
        projectDir: projectDir,
        projectName: plan.projectName,
      });
    }

    const projectDir =
      queue.getTask(taskId).projectDir ||
      path.resolve(OUTPUT_DIR, 'project_' + taskId);
    if (!fs.existsSync(projectDir))
      fs.mkdirSync(projectDir, { recursive: true });

    // Kerjain tiap subtask
    let prevResults = '';
    const completedSubtasks = task.completedSubtasks || [];

    for (const subtask of subtasks) {
      if (completedSubtasks.includes(subtask.id)) {
        console.log(`[daemon] Skip (done): ${subtask.title}`);
        continue;
      }

      console.log(
        `[daemon] Subtask ${subtask.id}/${subtasks.length}: ${subtask.title}`
      );

      let success = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const result = await executeSubtask(subtask, projectDir, prevResults);
          if (result.ok) {
            prevResults = (result.output || '').slice(0, 300);
            completedSubtasks.push(subtask.id);
            queue.updateTask(taskId, {
              progress: Math.round(
                (completedSubtasks.length / subtasks.length) * 100
              ),
              completedSubtasks,
            });
            success = true;
            break;
          }
        } catch (err) {
          console.log(`[daemon] Attempt ${attempt + 1} failed: ${err.message}`);
          await new Promise((r) => setTimeout(r, 3000));
        }
      }

      if (!success) {
        console.log(
          `[daemon] Subtask failed after 3 attempts: ${subtask.title}`
        );
      }
    }

    queue.updateTask(taskId, { status: 'done', progress: 100 });
    console.log(`[daemon] Task DONE: ${task.input.slice(0, 60)}`);
    console.log(`[daemon] Output: ${projectDir}`);
  } catch (err) {
    queue.updateTask(taskId, { status: 'failed', error: err.message });
    console.log(`[daemon] Task FAILED: ${err.message}`);
  }
}

module.exports = { planTask, runTask };
