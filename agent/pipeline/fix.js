'use strict';

function getRoles(ctx) {
  // Kalau ada kode/file yang dikasih → full pipeline
  const hasCode =
    ctx &&
    (ctx.input.includes('```') ||
      ctx.input.includes('function ') ||
      ctx.input.includes('const ') ||
      ctx.input.includes('def ') ||
      /\.(js|py|ts|java|php)\b/.test(ctx.input));

  if (hasCode) return ['researcher', 'builder'];

  // Kalau cuma error message tanpa kode → chatter jelasin solusinya
  return ['chatter'];
}

module.exports = { getRoles };
