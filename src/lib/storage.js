export const KINDS = ['notepad', 'checklist', 'bookmarks', 'image', 'folder'];

// Active slug set by the router from the URL.
let _currentSlug = null;

// Full room object cached from the server.
// Shape: { address?, id?, ownerVerifier?, store: { [kind]: { [path]: [...panels] } } }
let _roomCache = null;
let _loadedSlug = null; // slug currently reflected in _roomCache

export function setCurrentSlug(slug) {
  if (slug !== _currentSlug) {
    _currentSlug = slug;
    // Don't clear cache here — loadRoom() will handle it when slug differs from _loadedSlug
  }
}

// Load the full room from the server. Skips fetch if the slug hasn't changed.
export async function loadRoom() {
  const slug = _currentSlug;
  if (!slug) return;
  if (slug === _loadedSlug && _roomCache) return;

  const headers = {};
  const key = sessionStorage.getItem(`${slug}:key`);
  if (key) headers['X-Room-Key'] = key;

  try {
    const resp = await fetch(`/api/rooms/${slug}`, { headers });
    if (resp.ok) {
      _roomCache = await resp.json();
    } else if (resp.status === 404) {
      _roomCache = { store: {} };
    } else {
      throw new Error(`server returned ${resp.status}`);
    }
  } catch (err) {
    console.error('[storage] loadRoom failed:', err);
    if (!_roomCache) _roomCache = { store: {} };
  }

  _loadedSlug = slug;

  // Ensure room has a stable ID — only persist if we're the owner
  if (!_roomCache.id) {
    _roomCache.id = globalThis.crypto.randomUUID();
    if (sessionStorage.getItem(`${slug}:key`)) {
      patchRoom({ id: _roomCache.id });
    }
  }
}

// PATCH the server with a partial update. Fire-and-forget — callers don't await.
function patchRoom(updates) {
  const slug = _currentSlug;
  if (!slug) return;
  const headers = { 'Content-Type': 'application/json' };
  const key = sessionStorage.getItem(`${slug}:key`);
  if (key) headers['X-Room-Key'] = key;
  fetch(`/api/rooms/${slug}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(updates),
  }).catch(err => console.error('[storage] patchRoom failed:', err));
}

// --- Panel store operations ---

export function loadStore(kind, path = '') {
  return _roomCache?.store?.[kind]?.[path] ?? [];
}

export function saveStore(kind, path = '', data) {
  if (!_roomCache) _roomCache = { store: {} };
  if (!_roomCache.store[kind]) _roomCache.store[kind] = {};
  _roomCache.store[kind][path] = data;
  patchRoom({ store: { [kind]: { [path]: data } } });
}

// --- Room metadata ---

export function getAddressForSlug(slug) {
  if (_roomCache?.address) return _roomCache.address;
  // Derive from slug as fallback: "27-maple-lane" → "27 Maple Lane"
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export function setAddressForSlug(slug, address) {
  if (!_roomCache) _roomCache = { store: {} };
  _currentSlug = slug;
  _roomCache.address = address;
  patchRoom({ address });
}

export function getRoomId() {
  return _roomCache?.id ?? null;
}

// --- Owner verifier (for passphrase ownership, stored server-side) ---

export function getOwnerVerifier() {
  return _roomCache?.ownerVerifier ?? null;
}

export function storeOwnerVerifier(slug, verifier) {
  if (!_roomCache) _roomCache = { store: {} };
  _currentSlug = slug;
  _loadedSlug = slug;
  _roomCache.ownerVerifier = verifier;
  patchRoom({ ownerVerifier: verifier });
}

// --- Export / import helpers ---

// Returns the export-format rooms object for all paths at or under basePath.
export function gatherRoom(basePath) {
  const store = _roomCache?.store ?? {};
  const rooms = {};

  function collectPath(path) {
    const rel = basePath ? path.slice(basePath.length).replace(/^\//, '') : path;
    if (rel in rooms) return;
    const entry = {};
    KINDS.forEach(kind => {
      const panels = store[kind]?.[path];
      if (Array.isArray(panels) && panels.length) entry[kind] = panels;
    });
    if (Object.keys(entry).length) rooms[rel] = entry;
  }

  collectPath(basePath);

  const allPaths = new Set();
  KINDS.forEach(kind => Object.keys(store[kind] ?? {}).forEach(p => allPaths.add(p)));
  for (const path of allPaths) {
    if (!basePath || path === basePath || path.startsWith(basePath + '/')) {
      collectPath(path);
    }
  }

  return rooms;
}

export function roomHasData(basePath) {
  const store = _roomCache?.store ?? {};
  return KINDS.some(kind => {
    const panels = store[kind]?.[basePath];
    return Array.isArray(panels) && panels.length > 0;
  });
}

// Clear all store data at or under basePath, then sync to server.
export function clearRoomData(basePath) {
  if (!_roomCache?.store) return;
  const storePatch = {};
  KINDS.forEach(kind => {
    const kindStore = _roomCache.store[kind];
    if (!kindStore) return;
    Object.keys(kindStore).forEach(path => {
      if (path === (basePath ?? '') || (basePath && path.startsWith(basePath + '/'))) {
        kindStore[path] = [];
        if (!storePatch[kind]) storePatch[kind] = {};
        storePatch[kind][path] = [];
      }
    });
  });
  if (Object.keys(storePatch).length) patchRoom({ store: storePatch });
}

// Rename a path (and all sub-paths) in the cache, then sync to server.
export function renamePath(oldPath, newPath) {
  if (!_roomCache?.store) return;
  const storePatch = {};
  KINDS.forEach(kind => {
    const kindStore = _roomCache.store[kind];
    if (!kindStore) return;
    Object.keys(kindStore).forEach(path => {
      let newKey = null;
      if (path === oldPath) {
        newKey = newPath;
      } else if (path.startsWith(oldPath + '/')) {
        newKey = newPath + path.slice(oldPath.length);
      }
      if (newKey !== null) {
        kindStore[newKey] = kindStore[path];
        delete kindStore[path];
        if (!storePatch[kind]) storePatch[kind] = {};
        storePatch[kind][newKey] = kindStore[newKey];
        storePatch[kind][path] = []; // clear old path on server
      }
    });
  });
  if (Object.keys(storePatch).length) patchRoom({ store: storePatch });
}

// Apply an imported payload.rooms object into the cache, then sync.
// replace=true clears existing data at basePath first.
export function applyRoomData(roomsData, basePath, replace) {
  if (!_roomCache) _roomCache = { store: {} };

  if (replace) {
    KINDS.forEach(kind => {
      const kindStore = _roomCache.store[kind];
      if (!kindStore) return;
      Object.keys(kindStore).forEach(path => {
        if (path === (basePath ?? '') || (basePath && path.startsWith(basePath + '/'))) {
          delete kindStore[path];
        }
      });
    });
  }

  for (const [rel, entry] of Object.entries(roomsData)) {
    const targetPath = rel
      ? (basePath ? `${basePath}/${rel}` : rel)
      : (basePath ?? '');
    for (const kind of KINDS) {
      if (!entry[kind]) continue;
      if (!_roomCache.store[kind]) _roomCache.store[kind] = {};
      if (replace) {
        _roomCache.store[kind][targetPath] = entry[kind];
      } else {
        const existing = _roomCache.store[kind][targetPath] ?? [];
        const existingIds = new Set(existing.map(e => e.id));
        _roomCache.store[kind][targetPath] = [
          ...existing,
          ...entry[kind].filter(e => !existingIds.has(e.id)),
        ];
      }
    }
  }

  patchRoom({ store: _roomCache.store });
}

// Set whether the room appears on the public index.
export function setRoomOpen(open) {
  if (!_roomCache) return;
  _roomCache.open = open;
  patchRoom({ open });
}

export function getRoomOpen() {
  return _roomCache?.open === true;
}

// Delete the room from the server. Caller is responsible for local cleanup.
export async function deleteRoom() {
  const slug = _currentSlug;
  if (!slug) return;
  const headers = {};
  const key = sessionStorage.getItem(`${slug}:key`);
  if (key) headers['X-Room-Key'] = key;
  await fetch(`/api/rooms/${slug}`, { method: 'DELETE', headers });
  _roomCache = null;
  _loadedSlug = null;
}

// No-op: migration was for old localStorage key formats, not needed with server storage.
export function migrate() {}
