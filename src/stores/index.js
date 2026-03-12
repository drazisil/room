import { writable, get } from 'svelte/store';
import { loadRoom, loadStore, saveStore, KINDS } from '../lib/storage.js';

export const currentPath = writable('');
export const zCounter = writable(10);
export const undoStack = writable([]);

// One writable store per panel kind
export const panels = Object.fromEntries(KINDS.map(k => [k, writable([])]));

export async function loadAll(path) {
  await loadRoom();
  KINDS.forEach(kind => panels[kind].set(loadStore(kind, path)));
  undoStack.set([]);
}

export function saveKind(kind) {
  saveStore(kind, get(currentPath), get(panels[kind]));
}

export function addPanel(kind, data) {
  panels[kind].update(list => [...list, data]);
  saveKind(kind);
}

export function updatePanel(kind, id, updates) {
  panels[kind].update(list => list.map(p => p.id === id ? { ...p, ...updates } : p));
  saveKind(kind);
}

export function removePanel(kind, id) {
  let removed;
  panels[kind].update(list => {
    removed = list.find(p => p.id === id);
    return list.filter(p => p.id !== id);
  });
  saveKind(kind);
  if (removed) undoStack.update(s => [...s, { type: 'delete', kind, data: { ...removed } }]);
}

export function pushUndo(snap) {
  undoStack.update(s => [...s, snap]);
}

export function nextZ() {
  zCounter.update(z => z + 1);
  return get(zCounter);
}
