'use strict';

function isGreeting(input) {
  return /^(halo|hai|hi|hello|hey|yo|woy|oi|test|tes|ping|selamat pagi|selamat siang|selamat malam|assalamualaikum|hei)\s*[!?.\s]*$/i.test(
    input.trim()
  );
}

module.exports = { isGreeting };
