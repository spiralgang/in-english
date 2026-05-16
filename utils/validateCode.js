'use strict';

const vm = require('vm');

function validateJavaScript(code) {
  try {
    new vm.Script(code);

    return {
      valid: true,
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message,
    };
  }
}

module.exports = validateJavaScript;
