<script>
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import Breadcrumb from './components/Breadcrumb.svelte';
  import ContextMenu from './components/ContextMenu.svelte';
  import MergeDialog from './components/MergeDialog.svelte';
  import NotepadPanel from './components/NotepadPanel.svelte';
  import ChecklistPanel from './components/ChecklistPanel.svelte';
  import BookmarksPanel from './components/BookmarksPanel.svelte';
  import FolderPanel from './components/FolderPanel.svelte';
  import ImagePanel from './components/ImagePanel.svelte';

  import {
    currentPath,
    panels,
    undoStack,
    loadAll,
    addPanel,
    updatePanel,
  } from './stores/index.js';

  // Destructure so Svelte can auto-subscribe with $ syntax
  const { notepad: notepadPanels, checklist: checklistPanels, bookmarks: bookmarksPanels, image: imagePanels, folder: folderPanels } = panels;

  import { migrate, gatherRoom, roomHasData, clearRoomData, KINDS, pathKey, setCurrentSlug, getAddressForSlug } from './lib/storage.js';
  import { getAddress, getSlug, getRoomId } from './lib/address.js';
  import JoinPage from './components/JoinPage.svelte';

  // Page state: 'join' or 'room'
  let page = $state('room');

  // Context menu state
  let ctxMenu = $state(null); // null or { x, y }
  let ctxPos = $state({ x: 0, y: 0 });

  // Merge dialog state
  let mergeDialog = $state(null); // null or { payload }

  // ID of newly created folder that needs auto-rename
  let autoRenameId = $state(null);

  // Current path as reactive value
  let path = $state('');
  let address = $state('');

  // Slug is always the first URL segment — never read from localStorage for routing.
  function slugFromUrl(pathname) {
    const first = pathname.split('/').filter(Boolean)[0];
    return first || null;
  }

  function urlToPath(pathname) {
    const parts = pathname.split('/').filter(Boolean);
    return parts.slice(1).join('/');
  }

  function pathToUrl(p) {
    const slug = slugFromUrl(window.location.pathname) || getSlug();
    return p ? `/${slug}/${p}` : `/${slug}`;
  }

  function navigate(newPath) {
    history.pushState({}, '', pathToUrl(newPath));
    currentPath.set(newPath);
    path = newPath;
    loadAll(newPath);
  }

  function init() {
    if (window.location.pathname === '/join') {
      page = 'join';
      return;
    }
    page = 'room';
    const slug = slugFromUrl(window.location.pathname) || getSlug();
    setCurrentSlug(slug);
    address = getAddressForSlug(slug);
    // Canonicalize URL on first load at /
    if (window.location.pathname === '/') {
      history.replaceState({}, '', `/${slug}`);
    }
    const p = urlToPath(window.location.pathname);
    currentPath.set(p);
    path = p;
    loadAll(p);
  }

  function handleJoined(slug) {
    history.pushState({}, '', `/${slug}`);
    init();
  }

  onMount(() => {
    getRoomId(); // ensure ID exists before any data is written
    migrate();
    init();

    window.addEventListener('popstate', init);
    return () => {
      window.removeEventListener('popstate', init);
    };
  });

  // Keyboard handler for undo and context menu escape
  function handleKeyDown(e) {
    if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
      const stack = get(undoStack);
      if (!stack.length) return;
      e.preventDefault();
      const snap = stack[stack.length - 1];
      undoStack.update(s => s.slice(0, -1));
      applySnapshot(snap);
    }
    if (e.key === 'Escape') {
      ctxMenu = null;
    }
  }

  function applySnapshot(snap) {
    if (snap.type === 'delete') {
      addPanel(snap.kind, { ...snap.data });
      return;
    }
    // type === 'move': restore position/size
    updatePanel(snap.kind, snap.id, { x: snap.x, y: snap.y, w: snap.w, h: snap.h });
  }

  // Context menu
  function handleContextMenuOpen(e) {
    if (e.target.closest('.panel')) return;
    e.preventDefault();
    ctxPos = { x: e.clientX, y: e.clientY };
    ctxMenu = { x: e.clientX, y: e.clientY };
  }

  function handleClick() {
    if (ctxMenu) {
      ctxMenu = null;
    }
  }

  function handleContextMenuCreate(kind) {
    const pos = { ...ctxPos };
    ctxMenu = null;
    const id = kind + '-' + Date.now();
    const data = {
      id,
      kind,
      x: pos.x,
      y: pos.y,
      w: kind === 'folder' ? 160 : 320,
    };
    if (kind === 'folder') {
      data.name = 'new folder';
      autoRenameId = id;
    }
    addPanel(kind, data);
  }

  // Image drop
  let dragCounter = 0;

  function handleDragEnter(e) {
    if ([...e.dataTransfer.types].includes('Files')) {
      dragCounter++;
      document.body.classList.add('drag-over');
    }
  }

  function handleDragLeave() {
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      document.body.classList.remove('drag-over');
    }
  }

  function handleDragOver(e) {
    e.preventDefault();
  }

  function handleDrop(e) {
    e.preventDefault();
    dragCounter = 0;
    document.body.classList.remove('drag-over');
    [...e.dataTransfer.files].filter(f => f.type.startsWith('image/')).forEach((file, i) => {
      const reader = new FileReader();
      reader.onload = ev => {
        const id = 'image-' + Date.now() + '-' + i;
        const data = {
          id,
          kind: 'image',
          src: ev.target.result,
          x: e.clientX + i * 20,
          y: e.clientY + i * 20,
          w: 300,
          h: 240,
        };
        addPanel('image', data);
      };
      reader.readAsDataURL(file);
    });
  }

  // Save / Load room
  function saveRoom() {
    const basePath = get(currentPath);
    const rooms = gatherRoom(basePath);
    const payload = {
      version: 2,
      exported: new Date().toISOString().slice(0, 10),
      address: getAddress(),
      id: getRoomId(),
      rooms,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const name = basePath ? basePath.split('/').pop() : 'room';
    a.download = `${name}.room.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function loadRoom() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', () => {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        let payload;
        try { payload = JSON.parse(ev.target.result); } catch { alert('Invalid file.'); return; }
        if (!payload.rooms) { alert('Not a room file.'); return; }
        const basePath = get(currentPath);
        if (roomHasData(basePath)) {
          mergeDialog = { payload };
        } else {
          applyRoomPayload(payload, true);
        }
      };
      reader.readAsText(file);
    });
    input.click();
  }

  function applyRoomPayload(payload, replace) {
    const basePath = get(currentPath);
    if (replace) clearRoomData(basePath);
    Object.entries(payload.rooms).forEach(([rel, entry]) => {
      const targetPath = rel ? (basePath ? `${basePath}/${rel}` : rel) : basePath;
      KINDS.forEach(kind => {
        if (!entry[kind]) return;
        const key = pathKey(kind, targetPath);
        if (replace) {
          localStorage.setItem(key, JSON.stringify(entry[kind]));
        } else {
          let existing = [];
          try { existing = JSON.parse(localStorage.getItem(key) || '[]'); } catch {}
          const existingIds = new Set(existing.map(e => e.id));
          const merged = [...existing, ...entry[kind].filter(e => !existingIds.has(e.id))];
          localStorage.setItem(key, JSON.stringify(merged));
        }
      });
    });
    init();
  }

  function handleMerge() {
    const payload = mergeDialog.payload;
    mergeDialog = null;
    applyRoomPayload(payload, false);
  }

  function handleReplace() {
    const payload = mergeDialog.payload;
    mergeDialog = null;
    applyRoomPayload(payload, true);
  }

  function handleMergeCancel() {
    mergeDialog = null;
  }

  function clearAutoRename() {
    autoRenameId = null;
  }
</script>

<svelte:window
  onkeydown={handleKeyDown}
  ondragenter={handleDragEnter}
  ondragleave={handleDragLeave}
  ondragover={handleDragOver}
  ondrop={handleDrop}
/>

<svelte:document oncontextmenu={handleContextMenuOpen} onclick={handleClick} />

{#if page === 'join'}
  <JoinPage onjoined={handleJoined} />
{:else}

<div id="topbar">
  <Breadcrumb {path} {navigate} {address} />
  <div id="topbar-actions">
    <button onclick={saveRoom}>save room</button>
    <button onclick={loadRoom}>load room</button>
  </div>
</div>

{#each $notepadPanels as p (p.id)}
  <NotepadPanel {...p} />
{/each}

{#each $checklistPanels as p (p.id)}
  <ChecklistPanel {...p} />
{/each}

{#each $bookmarksPanels as p (p.id)}
  <BookmarksPanel {...p} {navigate} />
{/each}

{#each $folderPanels as p (p.id)}
  <FolderPanel {...p} {navigate} autoRename={p.id === autoRenameId} onclearautorename={clearAutoRename} />
{/each}

{#each $imagePanels as p (p.id)}
  <ImagePanel {...p} />
{/each}

{#if ctxMenu}
  <ContextMenu x={ctxMenu.x} y={ctxMenu.y} oncreate={handleContextMenuCreate} />
{/if}

{#if mergeDialog}
  <MergeDialog onmerge={handleMerge} onreplace={handleReplace} oncancel={handleMergeCancel} />
{/if}

{/if}
