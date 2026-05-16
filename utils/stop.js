/**
 * utils/stop.js — Anti infinite loop
 * Tracking step count + waktu eksekusi
 */

'use strict';

const MAX_DURATION_MS = 5 * 60 * 1000; // 5 menit hard limit

let startTime = null;

function init() {
  startTime = Date.now();
}

function shouldStop(currentStep, maxStep) {
  // 1. Cek max step
  if (currentStep >= maxStep) {
    console.error(`[stop] Max step tercapai: ${currentStep}/${maxStep}`);
    return true;
  }

  // 2. Cek durasi total
  if (startTime && Date.now() - startTime > MAX_DURATION_MS) {
    console.error(
      `[stop] Timeout: eksekusi melebihi ${MAX_DURATION_MS / 1000}s`
    );
    return true;
  }

  return false;
}

module.exports = { init, shouldStop };
