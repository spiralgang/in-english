'use strict';

const path = require('path');

const { detectIntent } = require('../router/intentRouter');

const {
  parseFileCommand,
  createFile,
} = require('../../tools/filesystem/createFile');

class SmartOrchestrator {
  async handle(input) {
    const intent = detectIntent(input);

    console.log('[intent]', intent);

    switch (intent) {
    case 'create_file':
      return this._handleCreateFile(input);

    case 'research':
      return {
        type: 'research',
        input,
      };

    case 'generate_project':
      return {
        type: 'builder',
        input,
      };

    default:
      return {
        type: 'chat',
        input,
      };
    }
  }

  _handleCreateFile(input) {
    const parsed = parseFileCommand(input);

    if (!parsed) {
      return {
        success: false,
        message: 'Format file tidak valid',
      };
    }

    const filePath = createFile(process.cwd(), parsed.filename, parsed.content);

    return {
      success: true,
      message: 'File berhasil dibuat',
      path: path.basename(filePath),
    };
  }
}

module.exports = SmartOrchestrator;
