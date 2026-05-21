'use strict';

const searchWeb     = require('../../tools/search_web');
const browserService = require('../../tools/browser_service');
const memory        = require('../../utils/memory_engine');

async function run(ctx) {
  const input = ctx.input || '';

  console.log('[researcher] Searching web...');
  const searchResults = await searchWeb.search(input, 5);

  if (!searchResults || searchResults.length === 0) {
    return {
      ok    : true,
      output: `Gue udah cari "${input}" tapi gak nemu hasil yang relevan.`,
      role  : 'researcher',
    };
  }

  const result = await browserService.browse(input, searchResults);
  return { ok: true, output: result.output, role: 'researcher' };
}

module.exports = { run };
