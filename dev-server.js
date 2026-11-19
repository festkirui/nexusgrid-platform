// server.js — Local dev server for NexusGrid (mimics Vercel routing)
// Serves static files + proxies /api to the Node.js handler
// Uses LOCAL MySQL for testing (matches WampServer setup)

const http = require('http');
const fs = require('fs');
const path = require('path');

// Temporarily override process.env to use MySQL2 or the local PG compat
// For local testing we'll use a mock db that connects to MySQL via mysql2
// BUT we don't have mysql2 installed, so let's bridge with mysql via php-style
// Actually — let's just serve the static HTML and test that the UI loads.
// The API calls will be tested against the existing PHP api at localhost/nexusgrid/api.php

const PORT = 3000;
const STATIC_DIR = __dirname;

const MIME = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
  '.woff2':'font/woff2',
  '.woff': 'font/woff',
};

const server = http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];
  
  // --- Route: /api/* → Node.js serverless handler ---
  if (url.startsWith('/api')) {
    // Set query params
    const queryStr = req.url.includes('?') ? req.url.split('?')[1] : '';
    const params = new URLSearchParams(queryStr);
    req.query = Object.fromEntries(params.entries());
    
    // Proxy-like response object
    const mockRes = {
      _status: 200,
      _headers: {},
      status(code) { this._status = code; return this; },
      setHeader(k, v) { this._headers[k] = v; return this; },
      json(data) {
        res.writeHead(this._status, { 'Content-Type': 'application/json', ...this._headers });
        res.end(JSON.stringify(data));
      },
      end() { res.writeHead(this._status, this._headers); res.end(); }
    };
    
    try {
      const handler = require('./api/index.js');
      await handler(req, mockRes);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // --- Route: /admin → admin.html ---
  let filePath = url === '/admin' || url === '/admin.html'
    ? path.join(STATIC_DIR, 'admin.html')
    : url === '/' || url === '/index.html'
    ? path.join(STATIC_DIR, 'index.html')
    : path.join(STATIC_DIR, url);

  const ext = path.extname(filePath);
  const mime = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // Fallback to index.html for SPA routing
      fs.readFile(path.join(STATIC_DIR, 'index.html'), (err2, data2) => {
        res.writeHead(err2 ? 404 : 200, { 'Content-Type': 'text/html' });
        res.end(err2 ? '404 Not Found' : data2);
      });
      return;
    }
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n✅ NexusGrid Dev Server running at http://localhost:${PORT}`);
  console.log(`   Contributor Portal: http://localhost:${PORT}/`);
  console.log(`   Admin Panel:        http://localhost:${PORT}/admin.html`);
  console.log(`   API endpoint:       http://localhost:${PORT}/api?action=tasks`);
  console.log(`\n   Press Ctrl+C to stop.\n`);
});
