'use strict';

const babuSadar = require('../../core/babu_sadar');
const babuEksplorasi = require('../../core/babu_eksplorasi');

function isSelfQuery(input) {
  const q = input.toLowerCase();

  return /(siapa kamu|siapa lu|kamu siapa|lu ai apa|ai apa|tentang lu|diri lu|fitur|bisa apa|memory|crew|agent|si babu|babu)/i.test(q);
}

function answerSelfQuery(input) {
  const sadar = babuSadar.answer(input);
  if (sadar) return sadar;

  return babuEksplorasi.quickReport();
}

module.exports = {
  isSelfQuery,
  answerSelfQuery,
};
