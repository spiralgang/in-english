'use strict';

const name = 'datetime';
const description =
  'Dapatkan waktu dan tanggal sekarang. Input: format (date/time/full)';

function run(input = 'full') {
  const now = new Date();
  const fmt = String(input).toLowerCase();
  if (fmt === 'date')
    return now.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  if (fmt === 'time') return now.toLocaleTimeString('id-ID');
  return now.toLocaleString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

module.exports = { name, description, run };
