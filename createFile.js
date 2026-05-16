// Import modul yang diperlukan
const fs = require('fs').promises; // Menggunakan fs.promises untuk operasi file asinkron
const path = require('path');     // Modul path untuk menangani jalur file dengan benar
require('dotenv').config();       // Memuat variabel lingkungan dari file .env

/**
 * Fungsi utama untuk membuat file JavaScript baru.
 * Mengambil nama file dan konten dari variabel lingkungan.
 * Menangani error secara asinkron.
 */
async function createNewJsFile() {
    // Mengambil konfigurasi dari variabel lingkungan
    // FILE_NAME: Nama file yang akan dibuat (misal: 'myScript')
    // FILE_CONTENT: Konten yang akan ditulis ke dalam file
    const fileNameFromEnv = process.env.FILE_NAME;
    const fileContentFromEnv = process.env.FILE_CONTENT || '// Ini adalah file JavaScript baru yang dibuat secara otomatis.\nconsole.log("Hello from new file!");';

    // --- Validasi Input ---
    if (!fileNameFromEnv) {
        console.error('ERROR: Variabel lingkungan FILE_NAME belum diatur.');
        console.error('Pastikan Anda memiliki file .env dengan FILE_NAME yang ditentukan.');
        process.exit(1); // Keluar dengan kode error
    }

    // Memastikan nama file memiliki ekstensi .js
    const finalFileName = fileNameFromEnv.endsWith('.js') ? fileNameFromEnv : `${fileNameFromEnv}.js`;
    // Membuat jalur lengkap ke file, menempatkannya di direktori yang sama dengan skrip ini
    const filePath = path.join(__dirname, finalFileName);

    console.log(`Mencoba membuat file: ${filePath}`);

    try {
        // --- Cek apakah file sudah ada (opsional, untuk memberikan feedback) ---
        try {
            await fs.access(filePath); // Mencoba mengakses file
            console.warn(`PERINGATAN: File '${finalFileName}' sudah ada. Kontennya akan ditimpa.`);
        } catch (accessError) {
            // Jika file tidak dapat diakses, berarti file tidak ada, yang diharapkan untuk pembuatan file baru.
            // Tidak perlu melakukan apa-apa di sini, lanjutkan untuk menulis file.
            if (accessError.code !== 'ENOENT') {
                // Jika error bukan 'ENOENT' (file not found), itu adalah error lain
                console.error(`ERROR: Terjadi masalah saat memeriksa keberadaan file '${finalFileName}'.`);
                throw accessError; // Lemparkan error agar ditangkap oleh blok catch utama
            }
        }

        // --- Menulis konten ke file ---
        await fs.writeFile(filePath, fileContentFromEnv, { encoding: 'utf8' });

        console.log(`SUKSES: File '${finalFileName}' berhasil dibuat di ${filePath}`);
    } catch (error) {
        // --- Penanganan Error Asinkron ---
        console.error(`ERROR: Gagal membuat file '${finalFileName}'.`);
        console.error(`Detail: ${error.message}`);
        // Untuk debugging lebih lanjut, bisa uncomment baris di bawah
        // console.error(error);
        process.exit(1); // Keluar dengan kode error
    }
}

// Memanggil fungsi utama untuk memulai proses
createNewJsFile();