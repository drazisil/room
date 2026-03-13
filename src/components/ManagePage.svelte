<script>
  import { get } from 'svelte/store';
  import { currentPath } from '../stores/index.js';
  import {
    getAddressForSlug,
    getRoomId,
    gatherRoom,
    applyRoomData,
    roomHasData,
    getRoomOpen,
    setRoomOpen,
    deleteRoom,
  } from '../lib/storage.js';
  import { clearEditMode } from '../lib/crypto.js';

  let { slug, onleave } = $props();

  let address = getAddressForSlug(slug);
  let open = $state(getRoomOpen());
  let confirmingDelete = $state(false);

  function toggleOpen() {
    open = !open;
    setRoomOpen(open);
  }

  // Export
  function exportRoom() {
    const rooms = gatherRoom('');
    const payload = {
      version: 2,
      exported: new Date().toISOString().slice(0, 10),
      address,
      id: getRoomId(),
      rooms,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${slug}.room.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // Import
  let mergeMode = $state(null); // null | { payload }

  function importRoom() {
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
        if (roomHasData('')) {
          mergeMode = { payload };
        } else {
          applyImport(payload, true);
        }
      };
      reader.readAsText(file);
    });
    input.click();
  }

  function applyImport(payload, replace) {
    applyRoomData(payload.rooms, '', replace);
    mergeMode = null;
    onleave(); // back to room so changes are visible
  }

  // Log out
  function logOut() {
    clearEditMode(slug);
    window.location.href = '/mine';
  }

  // Delete
  async function confirmDelete() {
    await deleteRoom();
    localStorage.removeItem('room-address');
    window.location.href = '/join';
  }
</script>

<div class="manage-wrap">
  <div class="manage-box">

    <div class="manage-address">{address}</div>

    <div class="manage-section">
      <p class="manage-hint">right-click the room to add a panel — notepad, checklist, bookmarks, or folder.</p>
      <p class="manage-hint">drag a panel by its header to move it. drag the corner to resize. × to delete.</p>
      <p class="manage-hint">drop an image file onto the room to add it. ctrl+z to undo.</p>
    </div>

    <div class="manage-section">
      <div class="manage-row">
        <span class="manage-label">open room</span>
        <button class="toggle" class:on={open} onclick={toggleOpen} aria-pressed={open}>
          {open ? 'on' : 'off'}
        </button>
      </div>
      <p class="manage-hint">open rooms appear on the front page for visitors to browse.</p>
    </div>

    <div class="manage-section">
      <button onclick={exportRoom}>export room</button>
      <button onclick={importRoom}>import room</button>
    </div>

    {#if mergeMode}
      <div class="manage-merge">
        <p>this room already has content. replace it or merge?</p>
        <div class="manage-row">
          <button onclick={() => applyImport(mergeMode.payload, true)}>replace</button>
          <button onclick={() => applyImport(mergeMode.payload, false)}>merge</button>
          <button onclick={() => mergeMode = null}>cancel</button>
        </div>
      </div>
    {/if}

    <div class="manage-section">
      <button onclick={logOut}>log out</button>
    </div>

    <div class="manage-section manage-danger">
      {#if confirmingDelete}
        <p class="manage-hint">this permanently deletes the room and everything in it.</p>
        <div class="manage-row">
          <button class="danger" onclick={confirmDelete}>yes, delete my room</button>
          <button onclick={() => confirmingDelete = false}>cancel</button>
        </div>
      {:else}
        <button class="danger" onclick={() => confirmingDelete = true}>delete room</button>
      {/if}
    </div>

    <div class="manage-back">
      <button onclick={onleave}>← back to room</button>
    </div>

  </div>
</div>

<style>
  .manage-wrap {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .manage-box {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    max-width: 28rem;
    width: 100%;
    padding: 0 2rem;
  }

  .manage-address {
    font-size: 1.4rem;
    color: var(--ink);
  }

  .manage-section {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    border-top: 1px solid var(--warm);
    padding-top: 1.5rem;
  }

  .manage-row {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }

  .manage-label {
    font-size: 0.85rem;
    color: var(--ink);
    flex: 1;
  }

  .manage-hint {
    font-size: 0.8rem;
    color: var(--faint);
    line-height: 1.5;
    margin: 0;
  }

  .manage-merge {
    background: color-mix(in srgb, var(--warm) 20%, transparent);
    border-radius: 4px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    font-size: 0.85rem;
    color: var(--faint);
  }

  .manage-merge p { margin: 0; }

  .manage-danger { }

  .manage-back {
    padding-top: 0;
    border-top: none;
  }

  button {
    font-size: 0.85rem;
    letter-spacing: 0.06em;
    color: var(--faint);
    cursor: pointer;
  }

  button:hover { color: var(--ink); }

  button.toggle {
    font-size: 0.75rem;
    border: 1px solid var(--warm);
    border-radius: 3px;
    padding: 0.2rem 0.6rem;
    color: var(--faint);
  }

  button.toggle.on {
    color: var(--ink);
    border-color: var(--ink);
  }

  button.danger { color: color-mix(in srgb, var(--faint) 70%, red); }
  button.danger:hover { color: red; }
</style>
