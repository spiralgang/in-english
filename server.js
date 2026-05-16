const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const process = require('process');

const PORT = process.env.PORT || 3000;

async function serveStaticFile(response, filePath, contentType) {
  try {
    const content = await fs.readFile(filePath);
    response.writeHead(200, { 'Content-Type': contentType });
    response.end(content);
  } catch (err) {
    response.statusCode = 404;
    response.end('File not found.');
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const filePath = path.join(
      __dirname,
      'public',
      req.url === '/' ? 'index.html' : req.url
    );
    const extname = path.extname(filePath);
    let contentType = 'text/html';

    switch (extname) {
    case '.js':
      contentType = 'text/javascript';
      break;
    case '.css':
      contentType = 'text/css';
      break;
    }

    await serveStaticFile(res, filePath, contentType);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end(`Server Error: ${err.message}`);
  }
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
