'use strict';

function isGibberish(input) {
  const pattern = /(.)\1{15,}|[^a-z0-9\s\-_,.!?]{8,}/i;

  return (
    pattern.test(input) ||
    (input.length > 100 &&
      input.replace(/[a-z0-9\s]/gi, '').length > input.length * 0.5)
  );
}

function randomResponse() {
  const responses = [
    'waduh, keyboard lo lagi nari-nari ya? 😂',
    'gue bingung bacanya, coba ulangin deh',
    'itu tadi kucing lo yang injek keyboard ya?',
    'maaf, gue ga ngerti bahasa alien 🙃',
    'keyboard stroke detected, coba lagi bos!',
  ];

  return responses[Math.floor(Math.random() * responses.length)];
}

module.exports = {
  isGibberish,
  randomResponse,
};
