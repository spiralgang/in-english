'use strict';

function getHistory() {
  try {
    const mem = require('../../utils/memory_engine').loadMemory();

    return (
      mem.short
        .filter((m) => m.input !== '[summary]')
        .slice(-6)
        .map((m) => `user: ${m.input}\nbabu: ${m.output?.slice(0, 150)}`)
        .join('\n') || ''
    );
  } catch {
    return '';
  }
}

module.exports = { getHistory };
