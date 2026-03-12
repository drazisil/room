import { readFile, writeFile } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { webcrypto } from 'node:crypto';

const { subtle } = webcrypto;
const __dirname = dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = join(__dirname, '..', 'data');
mkdirSync(DATA_DIR, { recursive: true });

const SLUG_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
const MAX_BODY = 2 * 1024 * 1024; // 2 MB

// Structured event log — useful for detecting brute-force attempts
function logEvent(event, detail = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), event, ...detail }));
}

// In-memory rate limiter for /verify: max 20 attempts per IP+slug per 15 minutes
const _verifyAttempts = new Map();
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000;

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    ?? req.socket?.remoteAddress
    ?? 'unknown';
}

function checkRateLimit(ip, slug) {
  const key = `${ip}:${slug}`;
  const now = Date.now();
  const entry = _verifyAttempts.get(key);
  if (!entry || now > entry.resetAt) {
    _verifyAttempts.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

// Only allow safe raster image data URIs — no SVG, no HTML
const SAFE_IMAGE_PREFIXES = [
  'data:image/png;base64,',
  'data:image/jpeg;base64,',
  'data:image/gif;base64,',
  'data:image/webp;base64,',
  'data:image/bmp;base64,',
];

function isSafeImageSrc(src) {
  return typeof src === 'string' && SAFE_IMAGE_PREFIXES.some(p => src.startsWith(p));
}

function validateSlug(slug) {
  if (!SLUG_RE.test(slug)) {
    const err = new Error('invalid slug');
    err.status = 400;
    throw err;
  }
}

async function readRoom(slug) {
  try {
    const raw = await readFile(join(DATA_DIR, `${slug}.json`), 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeRoom(slug, data) {
  await writeFile(join(DATA_DIR, `${slug}.json`), JSON.stringify(data, null, 2), 'utf8');
}

// Strip server-only fields before sending to clients
function sanitizeRoom(room) {
  const { ownerVerifier, ...rest } = room;
  return rest;
}

// Sanitize image panels: strip src if it isn't a safe data URI
function sanitizePanels(kind, panels) {
  if (!Array.isArray(panels)) return [];
  if (kind !== 'image') return panels;
  return panels.map(panel => {
    if ('src' in panel && !isSafeImageSrc(panel.src)) {
      const { src, ...rest } = panel;
      return rest;
    }
    return panel;
  });
}

// Merges patch into current at the kind+path level
function mergeRoom(current, patch) {
  const result = { ...current };
  if ('address' in patch) result.address = patch.address;
  if ('id' in patch) result.id = patch.id;
  // Only allow setting ownerVerifier to a valid object (never clearing it)
  if (patch.ownerVerifier && typeof patch.ownerVerifier === 'object') {
    result.ownerVerifier = patch.ownerVerifier;
  }
  if ('open' in patch) result.open = patch.open;
  if (patch.store) {
    result.store = { ...(result.store || {}) };
    for (const [kind, paths] of Object.entries(patch.store)) {
      result.store[kind] = { ...(result.store[kind] || {}) };
      for (const [path, panels] of Object.entries(paths)) {
        result.store[kind][path] = sanitizePanels(kind, panels);
      }
    }
  }
  return result;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY) {
        const err = new Error('payload too large');
        err.status = 413;
        reject(err);
        req.destroy();
        return;
      }
      body += chunk;
    });
    req.on('end', () => {
      if (!body) { resolve({}); return; }
      try { resolve(JSON.parse(body)); }
      catch {
        const err = new Error('invalid JSON');
        err.status = 400;
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function send(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

// Verify the X-Room-Key header (raw AES-GCM key, base64) against the room's ownerVerifier.
// Returns true only if decryption succeeds and yields the expected plaintext.
async function verifyOwnership(req, room) {
  const keyB64 = req.headers['x-room-key'];
  if (!keyB64 || !room?.ownerVerifier) return false;
  try {
    const keyBytes = Uint8Array.from(atob(keyB64), c => c.charCodeAt(0));
    const key = await subtle.importKey('raw', keyBytes, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const iv = Uint8Array.from(atob(room.ownerVerifier.iv), c => c.charCodeAt(0));
    const ct = Uint8Array.from(atob(room.ownerVerifier.ct), c => c.charCodeAt(0));
    const plain = await subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    return new TextDecoder().decode(plain) === 'roomcity-owner';
  } catch {
    return false;
  }
}

const PANEL_KINDS = ['notepad', 'checklist', 'bookmarks', 'image', 'folder'];

function roomHasContent(room) {
  const store = room?.store;
  if (!store) return false;
  return PANEL_KINDS.some(kind =>
    Object.values(store[kind] ?? {}).some(arr => Array.isArray(arr) && arr.length > 0)
  );
}

async function pickRandomRoom() {
  const { readdir } = await import('node:fs/promises');
  let files;
  try {
    files = (await readdir(DATA_DIR)).filter(f => f.endsWith('.json'));
  } catch {
    return null;
  }
  // Fisher-Yates shuffle
  for (let i = files.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [files[i], files[j]] = [files[j], files[i]];
  }
  for (const file of files) {
    const slug = file.slice(0, -5);
    const room = await readRoom(slug);
    if (room && room.open === true && roomHasContent(room)) return { slug, ...sanitizeRoom(room) };
  }
  return null;
}

// Routes (req.url must already have /api prefix stripped):
//   GET    /rooms/random       → random open room with content (404 if none)
//   GET    /rooms/:slug        → room JSON without ownerVerifier (404 if not found)
//   POST   /rooms/:slug/verify → verify X-Room-Key against ownerVerifier (200 or 403)
//   PATCH  /rooms/:slug        → merge patch (requires auth if room has ownerVerifier)
//   PUT    /rooms/:slug        → full replace (requires auth)
//   DELETE /rooms/:slug        → delete room file (requires auth)

export async function handleApiRequest(req, res) {
  const url = new URL(req.url, 'http://x');

  if (url.pathname === '/rooms/random' && req.method === 'GET') {
    const room = await pickRandomRoom();
    if (!room) {
      send(res, 404, { error: 'no rooms available' });
    } else {
      send(res, 200, room);
    }
    return true;
  }

  // POST /rooms/:slug/verify — ownership proof endpoint
  const verifyMatch = url.pathname.match(/^\/rooms\/([^/]+)\/verify$/);
  if (verifyMatch && req.method === 'POST') {
    const slug = verifyMatch[1];
    try { validateSlug(slug); } catch { send(res, 400, { error: 'invalid slug' }); return true; }
    const ip = getClientIp(req);
    if (!checkRateLimit(ip, slug)) {
      logEvent('verify.rate_limited', { slug, ip });
      send(res, 429, { error: 'too many attempts' });
      return true;
    }
    const room = await readRoom(slug);
    if (!room?.ownerVerifier) { send(res, 404, { error: 'not found' }); return true; }
    const ok = await verifyOwnership(req, room);
    logEvent(ok ? 'verify.ok' : 'verify.fail', { slug, ip });
    send(res, ok ? 200 : 403, ok ? { ok: true } : { error: 'forbidden' });
    return true;
  }

  const match = url.pathname.match(/^\/rooms\/([^/]+)\/?$/);
  if (!match) return false;

  const slug = match[1];
  try {
    validateSlug(slug);
  } catch {
    send(res, 400, { error: 'invalid slug' });
    return true;
  }

  try {
    if (req.method === 'GET') {
      const room = await readRoom(slug);
      if (!room) {
        send(res, 404, { error: 'not found' });
      } else if (!room.open) {
        // Closed room: only visible to the owner. Use 404 (not 403) so the
        // room's existence isn't revealed to an unauthorized visitor.
        const authed = await verifyOwnership(req, room);
        if (!authed) {
          send(res, 404, { error: 'not found' });
        } else {
          send(res, 200, sanitizeRoom(room));
        }
      } else {
        send(res, 200, sanitizeRoom(room));
      }
    } else if (req.method === 'PATCH') {
      const patch = await readBody(req);
      const current = await readRoom(slug);
      // Require auth if the room already has an owner
      if (current?.ownerVerifier) {
        const authed = await verifyOwnership(req, current);
        if (!authed) { send(res, 403, { error: 'forbidden' }); return true; }
      }
      const base = current || { store: {} };
      const updated = mergeRoom(base, patch);
      await writeRoom(slug, updated);
      send(res, 200, sanitizeRoom(updated));
    } else if (req.method === 'PUT') {
      const current = await readRoom(slug);
      if (current?.ownerVerifier) {
        const authed = await verifyOwnership(req, current);
        if (!authed) { send(res, 403, { error: 'forbidden' }); return true; }
      }
      const data = await readBody(req);
      await writeRoom(slug, data);
      send(res, 200, sanitizeRoom(data));
    } else if (req.method === 'DELETE') {
      const current = await readRoom(slug);
      if (!current) { send(res, 404, { error: 'not found' }); return true; }
      if (current.ownerVerifier) {
        const authed = await verifyOwnership(req, current);
        if (!authed) { send(res, 403, { error: 'forbidden' }); return true; }
      }
      const { unlink } = await import('node:fs/promises');
      await unlink(join(DATA_DIR, `${slug}.json`)).catch(() => {});
      logEvent('room.deleted', { slug, ip: getClientIp(req) });
      send(res, 200, { deleted: true });
    } else {
      send(res, 405, { error: 'method not allowed' });
    }
  } catch (err) {
    console.error('[api]', err);
    send(res, err.status || 500, { error: err.message });
  }
  return true;
}

// Connect-style middleware for Vite dev server (Vite strips /api prefix before calling)
export function createApiMiddleware() {
  return async (req, res, next) => {
    try {
      const handled = await handleApiRequest(req, res);
      if (!handled) next();
    } catch (err) {
      console.error('[api middleware]', err);
      next(err);
    }
  };
}
