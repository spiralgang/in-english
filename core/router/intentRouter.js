'use strict';

const FILE_PATTERNS = [
  /^buat file/i,
  /^create file/i,
  /^buatkan file/i,
  /^tulis file/i,
];

const RESEARCH_PATTERNS = [
  /^carikan/i,
  /^research/i,
  /^apa itu/i,
  /^jelaskan/i,
];

const PROJECT_PATTERNS = [
  /^buat website/i,
  /^buat aplikasi/i,
  /^buat project/i,
  /^buat web/i,
];

function detectIntent(input = '') {
  const text = input.trim();

  if (FILE_PATTERNS.some((p) => p.test(text))) {
    return 'create_file';
  }

  if (RESEARCH_PATTERNS.some((p) => p.test(text))) {
    return 'research';
  }

  if (PROJECT_PATTERNS.some((p) => p.test(text))) {
    return 'generate_project';
  }

  return 'chat';
}

module.exports = {
  detectIntent,
};
