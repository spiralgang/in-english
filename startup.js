const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');
const childProcess = require('child_process');
const readline = require('readline');

async function createDirectory(dirName) {
  try {
    await fs.promises.mkdir(dirName);
    console.log(`Direktori ${dirName} berhasil dibuat`);
  } catch (error) {
    console.error(`Gagal membuat direktori ${dirName}: ${error.message}`);
  }
}

async function writeFile(fileName, content) {
  try {
    await fs.promises.writeFile(fileName, content);
    console.log(`File ${fileName} berhasil dibuat`);
  } catch (error) {
    console.error(`Gagal membuat file ${fileName}: ${error.message}`);
  }
}

async function main() {
  const projectName = 'my-startup';
  const projectDir = path.join(os.homedir(), projectName);

  await createDirectory(projectDir);
  await writeFile(path.join(projectDir, 'README.md'), '# My Startup');
  await writeFile(
    path.join(projectDir, 'index.js'),
    'console.log("Hello World!");'
  );
}

main().catch((error) => console.error(`Error: ${error.message}`));
