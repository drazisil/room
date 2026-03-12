<script>
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import Breadcrumb from './components/Breadcrumb.svelte';
  import ContextMenu from './components/ContextMenu.svelte';
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

  import { setCurrentSlug, getAddressForSlug, getRoomOpen } from './lib/storage.js';
  import { getSlug } from './lib/address.js'; // used in pathToUrl
  import { isEditMode, clearEditMode } from './lib/crypto.js';
  import JoinPage from './components/JoinPage.svelte';
  import MinePage from './components/MinePage.svelte';
  import IndexPage from './components/IndexPage.svelte';
  import ManagePage from './components/ManagePage.svelte';

  // Page state: 'index' | 'join' | 'mine' | 'room' | 'manage'
  let page = $state('room');
  let activeSlug = $state('');
  let editMode = $state(false);

  // Context menu state
  let ctxMenu = $state(null); // null or { x, y }
  let ctxPos = $state({ x: 0, y: 0 });

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

  async function navigate(newPath) {
    history.pushState({}, '', pathToUrl(newPath));
    currentPath.set(newPath);
    path = newPath;
    await loadAll(newPath);
  }

  async function init() {
    const pathname = window.location.pathname;

    if (pathname === '/join') {
      page = 'join';
      return;
    }

    if (pathname === '/mine') {
      page = 'mine';
      return;
    }

    if (pathname === '/manage') {
      const homeAddr = localStorage.getItem('room-address');
      if (!homeAddr) {
        history.replaceState({}, '', '/join');
        page = 'join';
        return;
      }
      const slug = homeAddr.toLowerCase().replace(/\s+/g, '-');
      setCurrentSlug(slug);
      activeSlug = slug;
      await loadAll('');
      address = getAddressForSlug(slug);
      page = 'manage';
      return;
    }

    // / shows a random existing room read-only
    if (pathname === '/') {
      page = 'index';
      return;
    }

    const slug = slugFromUrl(pathname);
    if (!slug) {
      page = 'index';
      return;
    }

    setCurrentSlug(slug);
    activeSlug = slug;
    editMode = isEditMode(slug);
    const p = urlToPath(pathname);
    currentPath.set(p);
    path = p;
    await loadAll(p);
    address = getAddressForSlug(slug);

    // Closed rooms are invisible to non-owners — treat as not found.
    if (!getRoomOpen() && !editMode) {
      history.replaceState({}, '', '/');
      page = 'index';
      return;
    }

    page = 'room';
  }

  function navigateToManage() {
    history.pushState({}, '', '/manage');
    init().catch(console.error);
  }

  function leaveManage() {
    const homeAddr = localStorage.getItem('room-address');
    const slug = homeAddr ? homeAddr.toLowerCase().replace(/\s+/g, '-') : activeSlug;
    history.pushState({}, '', `/${slug}`);
    init().catch(console.error);
  }

  function handleJoined(slug) {
    history.pushState({}, '', `/${slug}`);
    init().catch(console.error);
  }

  onMount(() => {
    init().catch(console.error);

    const handlePop = () => init().catch(console.error);
    window.addEventListener('popstate', handlePop);
    return () => {
      window.removeEventListener('popstate', handlePop);
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

  // Context menu (edit mode only)
  function handleContextMenuOpen(e) {
    if (!editMode) return;
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

{#if page === 'index'}
  <IndexPage />
{:else if page === 'join'}
  <JoinPage onjoined={handleJoined} />
{:else if page === 'mine'}
  <MinePage />
{:else if page === 'manage'}
  <ManagePage slug={activeSlug} onleave={leaveManage} />
{:else}

<div id="topbar">
  <Breadcrumb {path} {navigate} {address} />
  <div id="topbar-actions">
    {#if editMode}
      <button onclick={navigateToManage}>manage</button>
      <button onclick={() => { clearEditMode(activeSlug); editMode = false; }}>leave</button>
    {/if}
  </div>
</div>

{#each $notepadPanels as p (p.id)}
  <NotepadPanel {...p} readonly={!editMode} />
{/each}

{#each $checklistPanels as p (p.id)}
  <ChecklistPanel {...p} readonly={!editMode} />
{/each}

{#each $bookmarksPanels as p (p.id)}
  <BookmarksPanel {...p} {navigate} readonly={!editMode} />
{/each}

{#each $folderPanels as p (p.id)}
  <FolderPanel {...p} {navigate} readonly={!editMode} autoRename={p.id === autoRenameId} onclearautorename={clearAutoRename} />
{/each}

{#each $imagePanels as p (p.id)}
  <ImagePanel {...p} readonly={!editMode} />
{/each}

{#if ctxMenu}
  <ContextMenu x={ctxMenu.x} y={ctxMenu.y} oncreate={handleContextMenuCreate} />
{/if}

{/if}

