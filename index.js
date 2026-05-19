const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');
const childProcess = require('child_process');
const readline = require('readline');
const axios = require('axios');
require('dotenv').config();

const apiUrl = process.env.API_URL;
const apiKey = process.env.API_KEY;
const phoneNumber = process.env.PHONE_NUMBER;

async function getLokasi() {
  try {
    const response = await axios.get(`https://ipapi.co/json/`);
    const lokasi = response.data;
    return lokasi;
  } catch (error) {
    console.error(error);
  }
}

async function kirimLokasi(lokasi) {
  try {
    const message = `Lokasi saya: ${lokasi.latitude}, ${lokasi.longitude}`;
    const response = await axios.post(`${apiUrl}/send-message`, {
      apiKey,
      phoneNumber,
      message,
    });
    console.log(response.data);
  } catch (error) {
    console.error(error);
  }
}

async function main() {
  const lokasi = await getLokasi();
  await kirimLokasi(lokasi);
}

main();