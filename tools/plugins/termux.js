'use strict';

const api = require('../termux_api');

const name        = 'termux';
const description = 'Akses fitur HP via Termux:API';

async function run(input) {
  const cmd = String(input).toLowerCase().trim();

  // SMS — harus dicek PERTAMA sebelum pattern lain
  if (/\b(sms|pesan masuk|pesan yang belum|inbox)\b/.test(cmd) ||
      /\b(baca|lihat|cek|tampil)\b.*\b(sms|pesan|notifikasi sms)\b/.test(cmd)) {
    const limit  = parseInt(cmd.match(/\d+/)?.[0] || '5');
    const unread = /belum dibaca|unread/.test(cmd);
    const sms    = api.getSMS({ limit, type: 'inbox' });
    if (!sms || sms.length === 0) return '📱 Tidak ada SMS masuk';
    const filtered = unread ? sms.filter(s => s.read === false) : sms;
    if (filtered.length === 0) return '📱 Tidak ada SMS yang belum dibaca';
    const list = filtered.map((s, i) => {
      return `[${i+1}] Dari: ${s.address}\nWaktu: ${s.received}\nIsi: ${s.body}`;
    }).join('\n\n');
    return `📱 ${filtered.length} SMS:\n\n${list}`;
  }

  // TTS — baca teks, bukan baca SMS
  if (/^\s*(bacain|ucapkan|speak|tts)\s+.+/i.test(input)) {
    const text = input.replace(/^\s*(bacain|ucapkan|speak|tts)\s+/i, '').trim();
    if (!text) return '❌ Tulis teks yang mau dibacain';
    const ok = api.speak(text, { lang: 'id' });
    return ok ? `🔊 Dibacain: "${text}"` : '❌ Gagal TTS';
  }

  // Notifikasi
  if (/\b(kasih|kirim|tampil|buat)\s*(notif|notifikasi)\b/.test(cmd)) {
    const text = input.replace(/.*?(kasih|kirim|tampil|buat)\s*(notif|notifikasi)\s*/i, '').trim() || 'Pesan dari SI BABU';
    const ok   = api.notify('SI BABU', text, { sound: true });
    return ok ? `✅ Notifikasi terkirim: "${text}"` : '❌ Gagal kirim notifikasi';
  }

  // Baterai
  if (/\b(cek|lihat|info)\s*(baterai|battery|daya)\b/.test(cmd)) {
    const b = api.getBattery();
    if (!b) return '❌ Gagal baca baterai';
    return `🔋 Baterai: ${b.percentage}% — ${b.status}`;
  }

  // Lokasi
  if (/\b(cek|lihat|kirim|ambil)\s*(lokasi|location|gps)\b/.test(cmd) ||
      /\b(dimana|di mana)\s*(aku|gue|saya|lo)\b/.test(cmd)) {
    const loc = await api.getLocation();
    if (!loc) return '❌ Gagal baca lokasi. Pastiin GPS aktif.';
    return `📍 Lokasi: ${loc.latitude}, ${loc.longitude}\nAkurasi: ${loc.accuracy}m`;
  }

  // Clipboard
  if (/\b(cek|baca|lihat)\s*(clipboard|papan klip)\b/.test(cmd)) {
    const content = api.getClipboard();
    return content ? `📋 Clipboard: ${content}` : '📋 Clipboard kosong';
  }

  // Foto kamera
  if (/\b(ambil|foto|kamera|potret)\b/.test(cmd)) {
    const depan   = /depan|front|selfie/.test(cmd);
    const camera  = depan ? 1 : 0;
    const outPath = `/data/data/com.termux/files/home/sibabu/output/foto_${Date.now()}.jpg`;
    const ok      = api.takePicture(outPath, camera);
    return ok ? `📸 Foto tersimpan: ${outPath}` : '❌ Gagal ambil foto';
  }

  // Device info
  if (/\b(cek|lihat|info)\s*(device|hp|wifi)\b/.test(cmd)) {
    const info = api.getDeviceInfo();
    const wifi = info.wifi ? `WiFi: ${info.wifi.ssid}` : 'WiFi: tidak terhubung';
    const bat  = info.battery ? `Baterai: ${info.battery.percentage}%` : '';
    return `📱 ${wifi}\n${bat}`;
  }

  // Getar
  if (/\bgetar\b/.test(cmd)) {
    api.vibrate(500);
    return '📳 Getar!';
  }

  // Toast
  if (/\btoast\b/.test(cmd)) {
    const text = input.replace(/.*?toast\s*/i, '').trim() || 'Halo dari SI BABU!';
    api.toast(text);
    return `✅ Toast: "${text}"`;
  }

  return null;
}

module.exports = { name, description, run };
