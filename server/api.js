import { readFile, writeFile } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = join(__dirname, '..', 'data');
mkdirSync(DATA_DIR, { recursive: true });

const SLUG_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

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

// Merges patch into current at the kind+path level
function mergeRoom(current, patch) {
  const result = { ...current };
  if ('address' in patch) result.address = patch.address;
  if ('id' in patch) result.id = patch.id;
  if ('ownerVerifier' in patch) result.ownerVerifier = patch.ownerVerifier;
  if (patch.store) {
    result.store = { ...(result.store || {}) };
    for (const [kind, paths] of Object.entries(patch.store)) {
      result.store[kind] = { ...(result.store[kind] || {}), ...paths };
    }
  }
  return result;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
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
  files.sort(() => Math.random() - 0.5);
  for (const file of files) {
    const slug = file.slice(0, -5);
    const room = await readRoom(slug);
    if (room && room.open === true && roomHasContent(room)) return { slug, ...room };
  }
  return null;
}

// Routes (req.url must already have /api prefix stripped):
//   GET    /rooms/random  → random open room with content (404 if none)
//   GET    /rooms/:slug   → full room JSON (404 if not found)
//   PATCH  /rooms/:slug   → merge patch into room (creates if missing)
//   PUT    /rooms/:slug   → full replace
//   DELETE /rooms/:slug   → delete room file

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
      } else {
        send(res, 200, room);
      }
    } else if (req.method === 'PATCH') {
      const patch = await readBody(req);
      const current = (await readRoom(slug)) || { store: {} };
      const updated = mergeRoom(current, patch);
      await writeRoom(slug, updated);
      send(res, 200, updated);
    } else if (req.method === 'PUT') {
      const data = await readBody(req);
      await writeRoom(slug, data);
      send(res, 200, data);
    } else if (req.method === 'DELETE') {
      const { unlink } = await import('node:fs/promises');
      await unlink(join(DATA_DIR, `${slug}.json`)).catch(() => {});
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
