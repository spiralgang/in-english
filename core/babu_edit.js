'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');

function readFile(relativePath) {
  const full = path.join(PROJECT_ROOT, relativePath);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, 'utf8');
}

function writeFile(relativePath, content) {
  const full = path.join(PROJECT_ROOT, relativePath);
  fs.writeFileSync(full, content, 'utf8');
  return true;
}

function runCommand(cmd) {
  try {
    const result = execSync(cmd, {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
      timeout: 30000,
    });
    return { success: true, output: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function applyFix(fixName) {
  const fixes = {
    fix_memory: () => {
      // Fix memory_engine.js kurung
      const file = 'utils/memory_engine.js';
      let content = readFile(file);
      if (!content) return false;
      let open = (content.match(/{/g) || []).length;
      let close = (content.match(/}/g) || []).length;
      if (open > close) {
        content += '\n}';
        writeFile(file, content);
        return true;
      }
      return false;
    },
    fix_provider: () => {
      // Ganti timeout NVIDIA
      const file = 'provider/nvidia.js';
      let content = readFile(file);
      if (!content) return false;
      if (content.includes('TIMEOUT_MS = 180000')) {
        content = content.replace('TIMEOUT_MS = 180000', 'TIMEOUT_MS = 30000');
        writeFile(file, content);
        return true;
      }
      return false;
    },
  };

  if (fixes[fixName]) {
    return fixes[fixName]();
  }
  return false;
}

module.exports = { readFile, writeFile, runCommand, applyFix };
