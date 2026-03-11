import { getSlug } from './address.js';

export const KINDS = ['notepad', 'checklist', 'bookmarks', 'image', 'folder'];

// All keys namespaced by address slug: "{slug}:store-{kind}" or "{slug}:store-{kind}:{path}"
export function pathKey(kind, path) {
  const slug = getSlug();
  return path ? `${slug}:store-${kind}:${path}` : `${slug}:store-${kind}`;
}

export function loadStore(kind, path) {
  try { return JSON.parse(localStorage.getItem(pathKey(kind, path))) || []; }
  catch { return []; }
}

export function saveStore(kind, path, data) {
  localStorage.setItem(pathKey(kind, path), JSON.stringify(data));
}

export function migrate() {
  const slug = getSlug();

  // Step 1: old plural keys → room-store-* format
  const pluralMap = {
    notepads: 'store-notepad',
    checklists: 'store-checklist',
    images: 'store-image',
    folders: 'store-folder',
  };
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (!key) continue;
    for (const [oldSuffix, newSuffix] of Object.entries(pluralMap)) {
      const oldPrefix = 'room-' + oldSuffix;
      if (key === oldPrefix || key.startsWith(oldPrefix + ':')) {
        const newKey = key.replace('room-' + oldSuffix, 'room-' + newSuffix);
        if (!localStorage.getItem(newKey)) localStorage.setItem(newKey, localStorage.getItem(key));
        localStorage.removeItem(key);
      }
    }
  }

  // Step 2: room-store-* → {slug}:store-*
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith('room-store-')) continue;
    const newKey = key.replace('room-store-', `${slug}:store-`);
    if (!localStorage.getItem(newKey)) localStorage.setItem(newKey, localStorage.getItem(key));
    localStorage.removeItem(key);
  }
}

export function gatherRoom(basePath) {
  const slug = getSlug();
  const prefix = `${slug}:store-`;
  const rooms = {};

  function collectPath(path) {
    const rel = basePath ? path.slice(basePath.length).replace(/^\//, '') : path;
    if (rel in rooms) return;
    const entry = {};
    KINDS.forEach(kind => {
      const val = localStorage.getItem(pathKey(kind, path));
      if (val) { try { entry[kind] = JSON.parse(val); } catch {} }
    });
    if (Object.keys(entry).length) rooms[rel] = entry;
  }

  collectPath(basePath);

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(prefix)) continue;
    // Extract internal path from key: {slug}:store-{kind}:{path}
    const rest = key.slice(prefix.length); // e.g. "notepad:projects/web"
    const colonIdx = rest.indexOf(':');
    if (colonIdx === -1) continue; // no sub-path, already collected at root
    const path = rest.slice(colonIdx + 1);
    if (!basePath || path === basePath || path.startsWith(basePath + '/')) {
      collectPath(path);
    }
  }

  return rooms;
}

export function roomHasData(basePath) {
  return KINDS.some(kind => {
    try { return JSON.parse(localStorage.getItem(pathKey(kind, basePath)) || '[]').length > 0; }
    catch { return false; }
  });
}

export function clearRoomData(basePath) {
  const slug = getSlug();
  const prefix = `${slug}:store-`;
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(prefix)) continue;
    const rest = key.slice(prefix.length);
    const colonIdx = rest.indexOf(':');
    const path = colonIdx === -1 ? '' : rest.slice(colonIdx + 1);
    if (path === basePath || path.startsWith(basePath ? basePath + '/' : '')) {
      localStorage.removeItem(key);
    }
  }
}

export function renamePath(oldPath, newPath) {
  const slug = getSlug();
  KINDS.forEach(kind => {
    const ok = `${slug}:store-${kind}:${oldPath}`;
    const nk = `${slug}:store-${kind}:${newPath}`;
    const v = localStorage.getItem(ok);
    if (v !== null) { localStorage.setItem(nk, v); localStorage.removeItem(ok); }
  });
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && key.includes(`:${oldPath}/`)) {
      const nk = key.replace(`:${oldPath}/`, `:${newPath}/`);
      localStorage.setItem(nk, localStorage.getItem(key));
      localStorage.removeItem(key);
    }
  }
}
