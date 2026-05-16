'use strict';

const name = 'calculator';
const description =
  'Hitung ekspresi matematika. Input: ekspresi string (contoh: "2 + 2 * 3")';

function run(input) {
  try {
    // Sanitize — hanya izinkan karakter matematika
    const sanitized = String(input).replace(/[^0-9+\-*/.() %^]/g, '');
    if (!sanitized) return 'Input tidak valid';
    const result = Function(`"use strict"; return (${sanitized})`)();
    return `${sanitized} = ${result}`;
  } catch (err) {
    return `Error: ${err.message}`;
  }
}

module.exports = { name, description, run };
