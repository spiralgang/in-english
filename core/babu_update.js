'use strict';

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = path.join(__dirname, '..');
const VERSION_FILE = path.join(PROJECT_ROOT, '.version');

function getVersion() {
  try {
    return fs.readFileSync(VERSION_FILE, 'utf8').trim();
  } catch {
    return 'dev';
  }
}

function checkForUpdates() {
  try {
    console.log('[UPDATE] Checking for updates...');
    execSync('git fetch origin 2>&1', { cwd: PROJECT_ROOT, timeout: 15000 });

    const local = execSync('git rev-parse HEAD', {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
    }).trim();
    const remote = execSync('git rev-parse origin/main', {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
    }).trim();

    if (local !== remote) {
      console.log('[UPDATE] New version available!');
      return {
        updateAvailable: true,
        local: local.slice(0, 8),
        remote: remote.slice(0, 8),
      };
    }

    return { updateAvailable: false };
  } catch (e) {
    return { updateAvailable: false, error: e.message };
  }
}

function applyUpdate() {
  try {
    console.log('[UPDATE] Downloading update...');
    execSync('git pull origin main 2>&1', {
      cwd: PROJECT_ROOT,
      timeout: 30000,
    });

    console.log('[UPDATE] Installing dependencies...');
    execSync('npm install --no-audit --no-fund 2>&1', {
      cwd: PROJECT_ROOT,
      timeout: 60000,
    });

    const newVersion = getVersion();
    console.log('[UPDATE] Updated to version:', newVersion);

    return { success: true, version: newVersion };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function getChangelog() {
  try {
    const log = execSync('git log --oneline -5', {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
    });
    return log.split('\n').filter(Boolean).join('\n');
  } catch {
    return 'Changelog not available';
  }
}

module.exports = { getVersion, checkForUpdates, applyUpdate, getChangelog };
