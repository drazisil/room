export const KINDS = ['notepad', 'checklist', 'bookmarks', 'image', 'folder'];

export function pathKey(kind, path) {
  return path ? `room-store-${kind}:${path}` : `room-store-${kind}`;
}

export function loadStore(kind, path) {
  try {
    return JSON.parse(localStorage.getItem(pathKey(kind, path))) || [];
  } catch {
    return [];
  }
}

export function saveStore(kind, path, data) {
  localStorage.setItem(pathKey(kind, path), JSON.stringify(data));
}

export function migrate() {
  const map = {
    notepads: 'store-notepad',
    checklists: 'store-checklist',
    images: 'store-image',
    folders: 'store-folder',
  };
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (!key) continue;
    for (const [oldSuffix, newSuffix] of Object.entries(map)) {
      const oldPrefix = 'room-' + oldSuffix;
      if (key === oldPrefix || key.startsWith(oldPrefix + ':')) {
        const newKey = key.replace('room-' + oldSuffix, 'room-' + newSuffix);
        if (!localStorage.getItem(newKey)) {
          localStorage.setItem(newKey, localStorage.getItem(key));
        }
        localStorage.removeItem(key);
      }
    }
  }
}

export function gatherRoom(basePath) {
  const rooms = {};

  function collectPath(path) {
    const rel = basePath ? path.slice(basePath.length).replace(/^\//, '') : path;
    const entry = {};
    KINDS.forEach(kind => {
      const val = localStorage.getItem(pathKey(kind, path));
      if (val) {
        try { entry[kind] = JSON.parse(val); } catch {}
      }
    });
    if (Object.keys(entry).length) rooms[rel] = entry;
  }

  collectPath(basePath);

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (!key.startsWith('room-store-')) continue;
    const colonIdx = key.indexOf(':');
    if (colonIdx === -1) continue;
    const path = key.slice(colonIdx + 1);
    if (basePath ? (path === basePath || path.startsWith(basePath + '/')) : true) {
      collectPath(path);
    }
  }

  return rooms;
}

export function roomHasData(basePath) {
  return KINDS.some(kind => {
    const key = basePath ? `room-store-${kind}:${basePath}` : `room-store-${kind}`;
    const val = localStorage.getItem(key);
    try { return val && JSON.parse(val).length > 0; } catch { return false; }
  });
}

export function clearRoomData(basePath) {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith('room-store-')) continue;
    const colonIdx = key.indexOf(':');
    const path = colonIdx === -1 ? '' : key.slice(colonIdx + 1);
    if (path === basePath || path.startsWith(basePath ? basePath + '/' : '')) {
      localStorage.removeItem(key);
    }
  }
}

export function renamePath(oldPath, newPath) {
  ['store-notepad', 'store-checklist', 'store-bookmarks', 'store-image', 'store-folder'].forEach(k => {
    const ok = `room-${k}:${oldPath}`, nk = `room-${k}:${newPath}`;
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
