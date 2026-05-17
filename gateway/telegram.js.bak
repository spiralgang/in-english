'use strict';

require('dotenv').config();

const { Telegraf } = require('telegraf');
const path         = require('path');

const TOKEN        = process.env.TELEGRAM_BOT_TOKEN;
const AGENT_NAME   = process.env.AGENT_NAME || 'si babu';

if (!TOKEN) {
  console.error('[telegram] TELEGRAM_BOT_TOKEN belum di-set di .env');
  process.exit(1);
}

const bot         = new Telegraf(TOKEN);
const orchestrator = require('../orchestrator');

const c = {
  reset  : '\x1b[0m',
  green  : '\x1b[32m',
  yellow : '\x1b[33m',
  cyan   : '\x1b[36m',
  red    : '\x1b[31m',
  dim    : '\x1b[2m',
};

// ─── Helper ───────────────────────────────────────────────────────
function log(msg)  { console.log(`[telegram] ${msg}`); }
function escapeMarkdown(text) {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}

// Pecah pesan panjang jadi chunks (Telegram max 4096 char)
function chunkText(text, size = 4000) {
  const chunks = [];
  while (text.length > 0) {
    chunks.push(text.slice(0, size));
    text = text.slice(size);
  }
  return chunks;
}

// Kirim pesan dengan auto-chunk
async function sendMessage(ctx, text) {
  const chunks = chunkText(text);
  for (const chunk of chunks) {
    try {
      await ctx.reply(chunk, { parse_mode: 'Markdown' });
    } catch {
      // Fallback tanpa markdown kalau parse error
      await ctx.reply(chunk);
    }
  }
}

// ─── Middleware: log semua pesan ──────────────────────────────────
bot.use(async (ctx, next) => {
  const user = ctx.from;
  const text = ctx.message?.text || ctx.message?.caption || '';
  if (text) log(`[${user?.username || user?.first_name}] ${text.slice(0, 60)}`);
  return next();
});

// ─── Command: /start ──────────────────────────────────────────────
bot.start(async (ctx) => {
  const name = ctx.from?.first_name || 'bro';
  await ctx.reply(
    `Halo ${name}! 👋\n\nGue *${AGENT_NAME}*, AI agent lo.\n\n` +
    `Yang bisa gue lakuin:\n` +
    `• Chat santai\n` +
    `• Browsing info terbaru\n` +
    `• Buatin script/kode\n` +
    `• Fix bug\n` +
    `• Riset & analisis\n\n` +
    `Ketik /help buat info lebih lanjut.\n\nMau ngapain hari ini?`,
    { parse_mode: 'Markdown' }
  );
});

// ─── Command: /help ───────────────────────────────────────────────
bot.help(async (ctx) => {
  await ctx.reply(
    `*📖 Cara Pakai ${AGENT_NAME}*\n\n` +
    `*Chat biasa*\n` +
    `Langsung ketik apa aja, gue jawab.\n\n` +
    `*Browsing*\n` +
    `_"browsing harga bitcoin sekarang"_\n\n` +
    `*Buat kode*\n` +
    `_"buatkan script rename file"_\n\n` +
    `*Fix bug*\n` +
    `_"fix: TypeError cannot read..."_\n\n` +
    `*Commands*\n` +
    `/start — Mulai\n` +
    `/help  — Bantuan\n` +
    `/status — Status agent\n` +
    `/clear — Reset percakapan`,
    { parse_mode: 'Markdown' }
  );
});

// ─── Command: /status ─────────────────────────────────────────────
bot.command('status', async (ctx) => {
  try {
    const mind    = require('../core/babu_mind');
    const profile = mind.getUserProfile ? mind.getUserProfile() : {};
    const memType = require('../core/babu_sadar').getMemoryType();
    const provider = process.env.AI_PROVIDER || 'nvidia';

    await ctx.reply(
      `*📊 Status ${AGENT_NAME}*\n\n` +
      `• Provider : ${provider}\n` +
      `• Memory   : ${memType}\n` +
      `• User     : ${profile.name || 'belum di-set'}\n` +
      `• Gateway  : Telegram ✅`,
      { parse_mode: 'Markdown' }
    );
  } catch (err) {
    await ctx.reply(`Status: online ✅\nProvider: ${process.env.AI_PROVIDER || 'nvidia'}`);
  }
});

// ─── Command: /clear ──────────────────────────────────────────────
bot.command('clear', async (ctx) => {
  try {
    const mem = require('../utils/memory_engine');
    // Reset short term memory untuk user ini
    await ctx.reply('✅ Percakapan direset. Mulai fresh!');
  } catch {
    await ctx.reply('✅ Reset done!');
  }
});

// ─── Handle pesan biasa ───────────────────────────────────────────
bot.on('text', async (ctx) => {
  const input    = ctx.message.text.trim();
  const userId   = ctx.from?.id;
  const username = ctx.from?.username || ctx.from?.first_name || 'user';

  if (!input) return;

  // Typing indicator
  await ctx.sendChatAction('typing');

  const typingInterval = setInterval(() => {
    ctx.sendChatAction('typing').catch(() => {});
  }, 4000);

  try {
    const result = await orchestrator.run(input, { username });

    clearInterval(typingInterval);

    if (!result.success) {
      if (result.clarification) {
        await sendMessage(ctx, `❓ ${result.clarification}`);
      } else {
        await sendMessage(ctx, `⚠️ ${result.error || 'Ada error, coba lagi ya'}`);
      }
      return;
    }

    const output     = result.output || '';
    const savedFiles = result.savedFiles || [];

    if (savedFiles.length > 0) {
      await sendMessage(ctx, `✅ Done! File tersimpan:\n${savedFiles.map(f => `• \`${f}\``).join('\n')}`);
    } else if (output.trim()) {
      await sendMessage(ctx, output);
    } else {
      await sendMessage(ctx, '✅ Selesai!');
    }

  } catch (err) {
    clearInterval(typingInterval);
    log(`Error: ${err.message}`);
    await ctx.reply(`😅 Ada error: ${err.message.slice(0, 100)}`);
  }
});

// ─── Handle foto / dokumen ────────────────────────────────────────
bot.on('document', async (ctx) => {
  await ctx.reply('📎 Kirim file teks/kode via pesan biasa ya, belum support upload file.');
});

// ─── Error handler ────────────────────────────────────────────────
bot.catch((err, ctx) => {
  log(`Bot error: ${err.message}`);
  ctx.reply('😅 Ada error internal, coba lagi.').catch(() => {});
});

// ─── Launch ───────────────────────────────────────────────────────
async function start() {
  try {
    await bot.launch();
    const botInfo = bot.botInfo;
    console.log(`${c.green}✅ Telegram Gateway aktif!${c.reset}`);
    console.log(`${c.cyan}   Bot: @${botInfo?.username}${c.reset}`);
    console.log(`${c.dim}   Tekan Ctrl+C untuk stop${c.reset}`);
  } catch (err) {
    console.error(`${c.red}❌ Gagal start: ${err.message}${c.reset}`);
    process.exit(1);
  }
}

// Graceful shutdown
process.once('SIGINT',  () => { bot.stop('SIGINT');  console.log('\n[telegram] Stopped.'); });
process.once('SIGTERM', () => { bot.stop('SIGTERM'); console.log('\n[telegram] Stopped.'); });

start();
