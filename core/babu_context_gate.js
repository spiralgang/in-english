'use strict';

function shouldInjectMemory(input) {
  return /\b(inget|lupa|sebelum|tadi|dulu|pernah|kenapa|kapan)\b/i.test(input);
}

function shouldInjectStyle(input) {
  return input.length > 30;
}

function shouldInjectSelfInfo(input) {
  return /\b(versi|memory|sadarlah|upgrade|diri lo|siapa lo|versi brp|versi berapa|lo versi|sekarang versi|versi lo)\b/i.test(
    input
  );
}

function shouldInjectBeliefs(input) {
  return /\b(siapa gua|ngerti gua|tau gua|kepribadian|kebiasaan)\b/i.test(
    input
  );
}

module.exports = {
  shouldInjectMemory,
  shouldInjectStyle,
  shouldInjectSelfInfo,
  shouldInjectBeliefs,
};
