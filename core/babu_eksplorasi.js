'use strict';

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');

// Baca file apa aja yang ada di folder
function listFiles(dir) {
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => !f.startsWith('.') && !f.includes('node_modules'));
  } catch {
    return [];
  }
}

// Eksplorasi diri sendiri
function explore() {
  const info = {
    version: 'unknown',
    memory: 'unknown',
    modules: [],
    crews: [],
    tools: [],
    size: '0KB',
  };

  // Baca versi
  try {
    info.version = fs
      .readFileSync(path.join(PROJECT_ROOT, '.version'), 'utf8')
      .trim();
  } catch {}

  // Cek memory
  const memDir = path.join(PROJECT_ROOT, 'memory');
  if (fs.existsSync(path.join(memDir, 'babu_mind.db'))) {
    const stat = fs.statSync(path.join(memDir, 'babu_mind.db'));
    info.memory = `SQLite (${(stat.size / 1024).toFixed(1)}KB)`;
  } else if (fs.existsSync(path.join(memDir, 'babu_mind.json'))) {
    info.memory = 'JSON';
  }

  // List core modules
  const coreDir = path.join(PROJECT_ROOT, 'core');
  info.modules = listFiles(coreDir)
    .filter((f) => f.startsWith('babu_'))
    .map((f) => f.replace('.js', ''));

  // List crew agents
  const crewDir = path.join(PROJECT_ROOT, 'agent', 'crew');
  info.crews = listFiles(crewDir)
    .filter((f) => f.endsWith('Agent.js'))
    .map((f) => f.replace('Agent.js', ''));

  // List tools
  const toolsDir = path.join(PROJECT_ROOT, 'tools');
  info.tools = listFiles(toolsDir)
    .filter((f) => f.endsWith('.js'))
    .map((f) => f.replace('.js', ''));

  // Project size
  try {
    const { execSync } = require('child_process');
    const size = execSync(`du -sh ${PROJECT_ROOT} 2>/dev/null | cut -f1`, {
      encoding: 'utf8',
    }).trim();
    info.size = size || 'unknown';
  } catch {}

  return info;
}

// Generate self-report tanpa LLM
function quickReport() {
  const info = explore();
  return [
    `Versi: ${info.version}`,
    `Memory: ${info.memory}`,
    `Module: ${info.modules.length} (${info.modules.slice(0, 5).join(', ')})`,
    `Crew: ${info.crews.join(', ')}`,
    info.size ? `Size: ${info.size}` : '',
  ]
    .filter(Boolean)
    .join(' | ');
}

module.exports = { explore, quickReport };
