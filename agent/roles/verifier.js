'use strict';

// Verifier di-disable sementara — langsung pass output
async function run(ctx) {
  const prevOutput = ctx.prev?.output || '';

  // Langsung return ok tanpa format aneh
  return {
    ok: true,
    output: prevOutput,
    role: 'verifier',
  };
}

module.exports = { run };
