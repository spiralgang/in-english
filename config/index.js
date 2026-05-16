const dotenv = require('dotenv');
const path = require('path');

// Memuat variabel lingkungan dari file .env
// Pastikan file .env ada di root proyek
dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * Objek konfigurasi aplikasi.
 * Mengambil nilai dari process.env atau menyediakan nilai default.
 */
const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  GREETING_MESSAGE: process.env.GREETING_MESSAGE || 'Hello World (default)',
  // Contoh konfigurasi sensitif lainnya:
  // API_KEY: process.env.API_KEY,
  // DB_HOST: process.env.DB_HOST,
};

// Validasi dasar untuk memastikan konfigurasi penting ada (opsional untuk Hello World)
if (!config.GREETING_MESSAGE) {
  console.warn('WARNING: GREETING_MESSAGE not set in .env or default. Using "Hello World (fallback)".');
  config.GREETING_MESSAGE = 'Hello World (fallback)';
}

module.exports = config;