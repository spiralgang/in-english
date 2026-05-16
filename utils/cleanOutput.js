'use strict';

function cleanOutput(text = '') {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^#+\s.*$/gm, '')
    .replace(/^\*\s.*$/gm, '')
    .trim();
}

module.exports = cleanOutput;
