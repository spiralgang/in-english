'use strict';

const { execSync, exec } = require('child_process');

function run(cmd, timeout = 10000) {
  try {
    return execSync(cmd, { timeout, encoding: 'utf8' }).trim();
  } catch (err) {
    return null;
  }
}

function runAsync(cmd) {
  return new Promise((resolve) => {
    exec(cmd, { timeout: 10000 }, (err, stdout) => {
      resolve(err ? null : stdout.trim());
    });
  });
}

// ─── Notifikasi ───────────────────────────────────────────────────
function notify(title, content, opts = {}) {
  const id      = opts.id      || 'sibabu';
  const icon    = opts.icon    || 'smart_toy';
  const vibrate = opts.vibrate || '200,100,200';
  const sound   = opts.sound   ? '--sound' : '';
  try {
    execSync(`termux-notification -t "${title}" -c "${content}" --id ${id} --icon ${icon} --vibrate ${vibrate} ${sound}`, { timeout: 5000 });
    return true;
  } catch { return false; }
}

// ─── Battery ──────────────────────────────────────────────────────
function getBattery() {
  try {
    const raw = run('termux-battery-status');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// ─── Location ─────────────────────────────────────────────────────
async function getLocation() {
  try {
    const { execSync } = require('child_process');
    const raw = execSync('termux-location -p network', { timeout: 15000, encoding: 'utf8' }).trim();
    return raw ? JSON.parse(raw) : null;
  } catch (e) { console.log('[termux] lokasi error:', e.message); return null; }
}

// ─── Clipboard ────────────────────────────────────────────────────
function getClipboard() {
  return run('termux-clipboard-get');
}

function setClipboard(text) {
  try {
    execSync(`termux-clipboard-set "${text.replace(/"/g, '\\"')}"`, { timeout: 5000 });
    return true;
  } catch { return false; }
}

// ─── TTS (Text to Speech) ─────────────────────────────────────────
function speak(text, opts = {}) {
  const lang  = opts.lang  || 'id';
  const rate  = opts.rate  || '1.0';
  const pitch = opts.pitch || '1.0';
  try {
    execSync(`termux-tts-speak -l ${lang} -r ${rate} -p ${pitch} "${text.replace(/"/g, '\\"')}"`, { timeout: 30000 });
    return true;
  } catch { return false; }
}

// ─── SMS ──────────────────────────────────────────────────────────
function getSMS(opts = {}) {
  try {
    const limit  = opts.limit  || 10;
    const type   = opts.type   || 'inbox';
    const raw    = run(`termux-sms-list -l ${limit} -t ${type}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function sendSMS(number, message) {
  try {
    execSync(`termux-sms-send -n "${number}" "${message.replace(/"/g, '\\"')}"`, { timeout: 10000 });
    return true;
  } catch { return false; }
}

// ─── Device Info ──────────────────────────────────────────────────
function getDeviceInfo() {
  try {
    const wifi    = run('termux-wifi-connectioninfo');
    const battery = getBattery();
    return {
      wifi   : wifi    ? JSON.parse(wifi)    : null,
      battery: battery || null,
    };
  } catch { return {}; }
}

// ─── Vibrate ──────────────────────────────────────────────────────
function vibrate(duration = 500) {
  try {
    execSync(`termux-vibrate -d ${duration}`, { timeout: 5000 });
    return true;
  } catch { return false; }
}

// ─── Toast ────────────────────────────────────────────────────────
function toast(text, short = true) {
  try {
    const duration = short ? '-s' : '';
    execSync(`termux-toast ${duration} "${text.replace(/"/g, '\\"')}"`, { timeout: 5000 });
    return true;
  } catch { return false; }
}

// ─── Camera ───────────────────────────────────────────────────────
function takePicture(outputPath, camera = 0) {
  try {
    execSync(`termux-camera-photo -c ${camera} "${outputPath}"`, { timeout: 15000 });
    return true;
  } catch { return false; }
}

module.exports = {
  notify,
  getBattery,
  getLocation,
  getClipboard,
  setClipboard,
  speak,
  getSMS,
  sendSMS,
  getDeviceInfo,
  vibrate,
  toast,
  takePicture,
};
