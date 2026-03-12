<script>
  import { onMount } from 'svelte';

  let room = $state(null);   // { slug, address, store, ... }
  let panels = $state([]);   // flat list of panels at root path
  let loading = $state(true);
  let empty = $state(false);

  onMount(async () => {
    try {
      const resp = await fetch('/api/rooms/random');
      if (!resp.ok) { empty = true; return; }
      room = await resp.json();
      history.replaceState({}, '', `/${room.slug}`);
      // Collect all panels from the root path ('')
      const store = room.store ?? {};
      const all = [];
      for (const kind of ['notepad', 'checklist', 'bookmarks', 'image', 'folder']) {
        const list = store[kind]?.[''] ?? [];
        list.forEach(p => all.push({ ...p, kind }));
      }
      panels = all;
    } catch (err) {
      console.error('index: failed to load room', err);
      empty = true;
    } finally {
      loading = false;
    }
  });

  function addressFromSlug(slug) {
    if (!slug) return '';
    return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
</script>

<div id="topbar">
  <span id="index-address">
    {#if room}
      {room.address ?? addressFromSlug(room.slug)}
    {:else if !loading}
      &nbsp;
    {/if}
  </span>
  <div id="topbar-actions">
    <a href="/join">want your own?</a>
  </div>
</div>

{#if loading}
  <!-- nothing while loading -->
{:else if empty || panels.length === 0}
  <div class="index-empty">no rooms yet</div>
{:else}
  <div class="index-canvas" aria-label="read-only room view">
    {#each panels as p (p.id)}
      <div
        class="panel index-panel"
        style:left="{p.x}px"
        style:top="{p.y}px"
        style:width="{p.w}px"
        style:height={p.h ? `${p.h}px` : null}
      >
        {#if p.kind === 'notepad'}
          <div class="panel-body index-notepad">{p.content ?? ''}</div>

        {:else if p.kind === 'checklist'}
          <ul class="panel-body index-checklist">
            {#each p.items ?? [] as item}
              <li class:done={item.done}>
                <span class="check">{item.done ? '✓' : '○'}</span>
                {item.text}
              </li>
            {/each}
          </ul>

        {:else if p.kind === 'bookmarks'}
          <ul class="panel-body index-bookmarks">
            {#each p.items ?? [] as item}
              <li><span class="bm-title">{item.title || item.url}</span></li>
            {/each}
          </ul>

        {:else if p.kind === 'image'}
          <div class="panel-body index-image">
            <img src={p.src} alt="" />
          </div>

        {:else if p.kind === 'folder'}
          <div class="panel-body index-folder">
            <span class="folder-name">{p.name ?? 'folder'}</span>
          </div>
        {/if}
      </div>
    {/each}
  </div>
{/if}

<style>
  #index-address {
    font-size: 0.85rem;
    color: var(--faint);
    letter-spacing: 0.04em;
  }

  #topbar-actions a {
    font-size: 0.85rem;
    color: var(--faint);
    text-decoration: none;
    letter-spacing: 0.06em;
  }

  #topbar-actions a:hover {
    color: var(--ink);
  }

  .index-canvas {
    position: relative;
    width: 100%;
    height: 100vh;
  }

  .index-panel {
    position: absolute;
    pointer-events: none;
    user-select: none;
  }

  .index-notepad {
    white-space: pre-wrap;
    font-size: 0.85rem;
    line-height: 1.6;
    overflow: hidden;
  }

  .index-checklist {
    list-style: none;
    padding: 0;
    margin: 0;
    font-size: 0.85rem;
  }

  .index-checklist li {
    display: flex;
    gap: 0.5rem;
    padding: 0.2rem 0;
  }

  .index-checklist li.done {
    opacity: 0.45;
  }

  .check {
    color: var(--faint);
    flex-shrink: 0;
    font-size: 0.75rem;
    margin-top: 0.1em;
  }

  .index-bookmarks {
    list-style: none;
    padding: 0;
    margin: 0;
    font-size: 0.85rem;
  }

  .index-bookmarks li {
    padding: 0.2rem 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .bm-title {
    color: var(--faint);
  }

  .index-image {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  .index-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .index-folder {
    display: flex;
    align-items: center;
    height: 100%;
  }

  .folder-name {
    font-size: 0.85rem;
    color: var(--faint);
  }

  .index-empty {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.85rem;
    color: var(--faint);
  }
</style>
