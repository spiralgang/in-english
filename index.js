const os = require('os');
const fs = require('fs');
const diskusage = require('diskusage');
const TelegramBot = require('node-telegram-bot-api');
const dotenv = require('dotenv');

dotenv.config();

const telegramToken = process.env.TELEGRAM_TOKEN;
const telegramChatId = process.env.TELEGRAM_CHAT_ID;
const thresholdCpu = process.env.THRESHOLD_CPU;
const thresholdRam = process.env.THRESHOLD_RAM;
const thresholdDisk = process.env.THRESHOLD_DISK;

const bot = new TelegramBot(telegramToken, { polling: false });

async function getDiskUsage() {
  try {
    const disk = await diskusage.check('/');
    return (disk.used / disk.total) * 100;
  } catch (error) {
    console.error('Error getting disk usage:', error);
    return null;
  }
}

async function getCpuUsage() {
  try {
    const cpus = os.cpus();
    const idleTime = cpus.reduce((acc, cpu) => acc + cpu.times.idle, 0);
    const totalTime = cpus.reduce((acc, cpu) => acc + cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq, 0);
    return (1 - (idleTime / totalTime)) * 100;
  } catch (error) {
    console.error('Error getting CPU usage:', error);
    return null;
  }
}

async function getRamUsage() {
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    return (1 - (freeMem / totalMem)) * 100;
  } catch (error) {
    console.error('Error getting RAM usage:', error);
    return null;
  }
}

async function sendNotification(message) {
  try {
    await bot.sendMessage(telegramChatId, message);
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

async function monitorSystem() {
  try {
    const cpuUsage = await getCpuUsage();
    const ramUsage = await getRamUsage();
    const diskUsage = await getDiskUsage();

    if (cpuUsage > thresholdCpu || ramUsage > thresholdRam || diskUsage > thresholdDisk) {
      const message = `CPU usage: ${cpuUsage}%\nRAM usage: ${ramUsage}%\nDisk usage: ${diskUsage}%`;
      await sendNotification(message);
    }

    console.log(`CPU usage: ${cpuUsage}%`);
    console.log(`RAM usage: ${ramUsage}%`);
    console.log(`Disk usage: ${diskUsage}%`);
  } catch (error) {
    console.error('Error monitoring system:', error);
  }
}

setInterval(monitorSystem, 60000); // monitor every 1 minute