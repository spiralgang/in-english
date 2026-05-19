'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const provider     = require('../../provider/router');
const { loadPlugins } = require('../../tools/plugin_loader');

const TOOLS = [
  {
    name       : 'baca_sms',
    description: 'Baca SMS masuk dari HP. Gunakan kalau user minta lihat/baca/cek SMS atau pesan masuk.',
    params     : 'jumlah (angka, default 5), filter (semua/belum_dibaca)',
  },
  {
    name       : 'kirim_notifikasi',
    description: 'Kirim notifikasi ke HP. Gunakan kalau user minta kasih notif atau reminder.',
    params     : 'judul, isi',
  },
  {
    name       : 'cek_baterai',
    description: 'Cek status baterai HP.',
    params     : 'tidak ada',
  },
  {
    name       : 'cek_lokasi',
    description: 'Ambil lokasi GPS saat ini.',
    params     : 'tidak ada',
  },
  {
    name       : 'ambil_foto',
    description: 'Ambil foto dari kamera HP.',
    params     : 'kamera (depan/belakang)',
  },
  {
    name       : 'tts',
    description: 'Bacain teks pakai suara (text-to-speech).',
    params     : 'teks yang mau dibacain',
  },
  {
    name       : 'cek_clipboard',
    description: 'Lihat isi clipboard HP.',
    params     : 'tidak ada',
  },
  {
    name       : 'cek_wifi',
    description: 'Cek info WiFi dan device.',
    params     : 'tidak ada',
  },
];

async function decide(input) {
  const toolList = TOOLS.map(t =>
    `- ${t.name}: ${t.description} (params: ${t.params})`
  ).join('\n');

  const prompt = `Kamu adalah AI yang menentukan apakah user butuh tool atau tidak.

INPUT USER: "${input}"

TOOLS YANG TERSEDIA:
${toolList}

Tugasmu:
1. Tentukan apakah input user butuh salah satu tool di atas
2. Kalau butuh, tentukan tool mana dan parameternya
3. Kalau tidak butuh tool, jawab NONE

Contoh:
- 'cek lokasi sekarang' → {"tool": "cek_lokasi", "params": {}}
- 'bacain halo dunia' → {"tool": "tts", "params": {"teks": "halo dunia"}}
- 'baca sms' → {"tool": "baca_sms", "params": {"jumlah": 5}}
- 'kasih notif test' → {"tool": "kirim_notifikasi", "params": {"judul": "SI BABU", "isi": "test"}}
- 'foto kamera depan' → {"tool": "ambil_foto", "params": {"kamera": "depan"}}
- 'cuaca hari ini' → {"tool": "NONE"}

Jawab HANYA dengan format JSON ini tanpa markdown:
{"tool": "nama_tool", "params": {"key": "value"}}

Atau kalau tidak butuh tool:
{"tool": "NONE"}`;

  try {
    const raw = await provider.call(prompt, { maxTokens: 150, temperature: 0.1 });
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return { tool: 'NONE' };
    return JSON.parse(match[0]);
  } catch {
    return { tool: 'NONE' };
  }
}

async function execute(toolName, params = {}) {
  const plugins = loadPlugins();
  const api     = require('../../tools/termux_api');

  switch (toolName) {
    case 'baca_sms': {
      const limit    = parseInt(params.jumlah) || 5;
      const unread   = params.filter === 'belum_dibaca';
      const sms      = api.getSMS({ limit, type: 'inbox' });
      if (!sms || sms.length === 0) return 'Tidak ada SMS masuk.';
      const filtered = unread ? sms.filter(s => s.read === false) : sms;
      if (filtered.length === 0) return 'Tidak ada SMS yang belum dibaca.';
      return filtered.map((s, i) =>
        `[${i+1}] Dari: ${s.address}\nWaktu: ${s.received}\nIsi: ${s.body}`
      ).join('\n\n');
    }

    case 'kirim_notifikasi': {
      const ok = api.notify(params.judul || 'SI BABU', params.isi || '', { sound: true });
      return ok ? 'Notifikasi berhasil dikirim.' : 'Gagal kirim notifikasi.';
    }

    case 'cek_baterai': {
      const b = api.getBattery();
      if (!b) return 'Gagal baca baterai.';
      return `Baterai ${b.percentage}%, status: ${b.status}`;
    }

    case 'cek_lokasi': {
      const loc = await api.getLocation();
      if (!loc) return 'Gagal baca lokasi. Pastiin GPS aktif.';
      return `Lokasi: ${loc.latitude}, ${loc.longitude} (akurasi ${loc.accuracy}m)`;
    }

    case 'ambil_foto': {
      const depan  = params.kamera === 'depan';
      const output = `/data/data/com.termux/files/home/sibabu/output/foto_${Date.now()}.jpg`;
      const ok     = api.takePicture(output, depan ? 1 : 0);
      return ok ? `Foto tersimpan di: ${output}` : 'Gagal ambil foto.';
    }

    case 'tts': {
      const ok = api.speak(params.teks || '', { lang: 'id' });
      return ok ? `Dibacain: "${params.teks}"` : 'Gagal TTS.';
    }

    case 'cek_clipboard': {
      const content = api.getClipboard();
      return content ? `Isi clipboard: ${content}` : 'Clipboard kosong.';
    }

    case 'cek_wifi': {
      const info = api.getDeviceInfo();
      const wifi = info.wifi ? `WiFi: ${info.wifi.ssid}` : 'Tidak terhubung ke WiFi';
      const bat  = info.battery ? `, Baterai: ${info.battery.percentage}%` : '';
      return wifi + bat;
    }

    default:
      return null;
  }
}

module.exports = { decide, execute, TOOLS };
