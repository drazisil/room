import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleApiRequest } from './api.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '..', 'dist');
const PORT = process.env.PORT || 3000;

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self' data:;",
  // No referrer sent when navigating away — rooms don't announce themselves to external sites
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'interest-cohort=(), camera=(), microphone=(), geolocation=()',
};

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.txt': 'text/plain',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  // API routes: strip /api prefix before handing off
  if (url.pathname.startsWith('/api/')) {
    req.url = url.pathname.slice(4) + (url.search || '');
    const handled = await handleApiRequest(req, res).catch(err => {
      console.error('[server]', err);
      res.writeHead(500);
      res.end('Internal Server Error');
      return true;
    });
    if (handled) return;
  }

  // Static files from dist/
  const filePath = join(DIST, url.pathname === '/' ? 'index.html' : url.pathname);
  try {
    const data = await readFile(filePath);
    const mime = MIME[extname(filePath)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime, ...SECURITY_HEADERS });
    res.end(data);
  } catch {
    // SPA fallback
    try {
      const html = await readFile(join(DIST, 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', ...SECURITY_HEADERS });
      res.end(html);
    } catch {
      res.writeHead(500);
      res.end('Internal Server Error');
    }
  }
});

server.listen(PORT, () => {
  console.log(`Room server at http://localhost:${PORT}`);
});
