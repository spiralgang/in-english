'use strict';

const fs = require('fs');
const path = require('path');

function parseFileCommand(input = '') {
  const match = input.match(/buat file\s+([^\s]+)\s+isi\s+(.+)/i);

  if (!match) {
    return null;
  }

  return {
    filename: match[1],
    content: match[2],
  };
}

function createFile(baseDir, filename, content) {
  const filePath = path.join(baseDir, filename);

  fs.writeFileSync(filePath, content, 'utf8');

  return filePath;
}

module.exports = {
  parseFileCommand,
  createFile,
};
