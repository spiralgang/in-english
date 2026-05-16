'use strict';

require('dotenv').config();

const AGENT_NAME = process.env.AGENT_NAME || 'si babu';
const WA_MODE    = process.env.WA_MODE || 'wwebjs';

const c = {
  reset : '\x1b[0m',
  green : '\x1b[32m',
  yellow: '\x1b[33m',
  red   : '\x1b[31m',
  cyan  : '\x1b[36m',
  dim   : '\x1b[2m',
};

function log(msg)  { console.log(`[whatsapp] ${msg}`); }

// ─── Mode: whatsapp-web.js ────────────────────────────────────────
async function startWWebJS() {
  let Client, LocalAuth, qrcode;

  try {
    const wwebjs = require('whatsapp-web.js');
    Client    = wwebjs.Client;
    LocalAuth = wwebjs.LocalAuth;
    qrcode    = require('qrcode-terminal');
  } catch (err) {
    console.error(`${c.red}❌ whatsapp-web.js belum terinstall.${c.reset}`);
    console.error(`${c.dim}Jalankan: npm install whatsapp-web.js qrcode-terminal${c.reset}`);
    process.exit(1);
  }

  const orchestrator = require('../orchestrator');

  const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './memory/wa_session' }),
    puppeteer   : {
      headless: true,
      args    : [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
      ],
    },
  });

  // QR Code
  client.on('qr', (qr) => {
    console.log(`\n${c.cyan}Scan QR Code ini di WhatsApp lo:${c.reset}\n`);
    qrcode.generate(qr, { small: true });
    console.log(`\n${c.dim}WhatsApp → Linked Devices → Link a Device${c.reset}\n`);
  });

  // Ready
  client.on('ready', () => {
    console.log(`${c.green}✅ WhatsApp Gateway aktif!${c.reset}`);
    console.log(`${c.dim}   Mode: whatsapp-web.js${c.reset}`);
  });

  // Auth success
  client.on('authenticated', () => {
    log('Authenticated ✓');
  });

  // Auth failure
  client.on('auth_failure', (msg) => {
    console.error(`${c.red}❌ Auth gagal: ${msg}${c.reset}`);
  });

  // Disconnected
  client.on('disconnected', (reason) => {
    console.warn(`${c.yellow}⚠️  Disconnected: ${reason}${c.reset}`);
    setTimeout(() => client.initialize(), 5000);
  });

  // Handle pesan masuk
  client.on('message', async (msg) => {
    // Skip grup, status, media
    if (msg.isGroupMsg)                 return;
    if (msg.type !== 'chat')            return;
    if (msg.from === 'status@broadcast') return;

    const input = msg.body.trim();
    if (!input) return;

    log(`[${msg.from}] ${input.slice(0, 60)}`);

    try {
      // Typing indicator
      const chat = await msg.getChat();
      await chat.sendStateTyping();

      const result = await orchestrator.run(input);

      await chat.clearState();

      if (!result.success) {
        await msg.reply(result.clarification || result.error || 'Ada error, coba lagi ya 😅');
        return;
      }

      const output     = result.output || '';
      const savedFiles = result.savedFiles || [];

      if (savedFiles.length > 0) {
        await msg.reply(`✅ Done! File tersimpan:\n${savedFiles.map(f => `• ${f}`).join('\n')}`);
      } else if (output.trim()) {
        // Pecah kalau terlalu panjang (WA max ~65000 char tapi lebih baik < 4000)
        if (output.length > 4000) {
          const chunks = [];
          let text = output;
          while (text.length > 0) { chunks.push(text.slice(0, 4000)); text = text.slice(4000); }
          for (const chunk of chunks) await msg.reply(chunk);
        } else {
          await msg.reply(output);
        }
      } else {
        await msg.reply('✅ Selesai!');
      }

    } catch (err) {
      log(`Error: ${err.message}`);
      await msg.reply(`😅 Ada error: ${err.message.slice(0, 100)}`);
    }
  });

  client.initialize();
}

// ─── Mode: Twilio ─────────────────────────────────────────────────
async function startTwilio() {
  let express, twilio;

  try {
    express = require('express');
    twilio  = require('twilio');
  } catch (err) {
    console.error(`${c.red}❌ express/twilio belum terinstall.${c.reset}`);
    console.error(`${c.dim}Jalankan: npm install express twilio${c.reset}`);
    process.exit(1);
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const waNumber   = process.env.TWILIO_WHATSAPP_NUMBER;
  const port       = process.env.WA_PORT || 3001;

  if (!accountSid || !authToken || !waNumber) {
    console.error(`${c.red}❌ TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER belum di-set${c.reset}`);
    process.exit(1);
  }

  const orchestrator = require('../orchestrator');
  const client       = twilio(accountSid, authToken);
  const app          = express();

  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());

  app.post('/webhook', async (req, res) => {
    const input = (req.body.Body || '').trim();
    const from  = req.body.From || '';

    if (!input) return res.sendStatus(200);

    log(`[${from}] ${input.slice(0, 60)}`);

    try {
      const result = await orchestrator.run(input);
      const output = result.success
        ? (result.output || '✅ Selesai!')
        : (result.error  || 'Ada error 😅');

      await client.messages.create({
        from: `whatsapp:${waNumber}`,
        to  : from,
        body: output.slice(0, 1500),
      });

    } catch (err) {
      log(`Error: ${err.message}`);
    }

    res.sendStatus(200);
  });

  app.get('/health', (_, res) => res.json({ status: 'ok', gateway: 'whatsapp-twilio' }));

  app.listen(port, () => {
    console.log(`${c.green}✅ WhatsApp Twilio Gateway aktif!${c.reset}`);
    console.log(`${c.cyan}   Webhook: http://your-server:${port}/webhook${c.reset}`);
    console.log(`${c.dim}   Set webhook di Twilio Console → WhatsApp Sandbox${c.reset}`);
  });
}

// ─── Start berdasarkan mode ───────────────────────────────────────
if (WA_MODE === 'twilio') {
  startTwilio();
} else {
  startWWebJS();
}
