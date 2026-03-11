<script>
  import { onMount } from 'svelte';
  import Panel from './Panel.svelte';
  import { updatePanel, addPanel } from '../stores/index.js';

  let { id, x, y, w, h, items: initialItems = [], scrollTop: initialScrollTop = 0 } = $props();

  let items = $state(initialItems.map(item => ({ ...item })));
  let ulEl = $state(null);
  let scrollSavedOpacity = $state(0);
  let scrollSavedText = $state('');
  let scrollTimer = null;
  let scrollSaveTimer = null;

  // For rename inline editing
  let renamingIndex = $state(-1);
  let renameValue = $state('');

  // Add row
  let urlInput = $state('');
  let titleInput = $state('');
  let urlInputEl = $state(null);
  let titleInputEl = $state(null);

  onMount(() => {
    requestAnimationFrame(() => {
      if (ulEl && initialScrollTop) ulEl.scrollTop = initialScrollTop;
    });
  });

  function saveBookmarks() {
    updatePanel('bookmarks', id, { items: $state.snapshot(items), scrollTop: ulEl ? ulEl.scrollTop : 0 });
  }

  function removeItem(i) {
    items.splice(i, 1);
    saveBookmarks();
  }

  function startRename(i) {
    renamingIndex = i;
    renameValue = items[i].title;
  }

  function commitRename() {
    if (renamingIndex >= 0 && renamingIndex < items.length) {
      const trimmed = renameValue.trim();
      if (trimmed) items[renamingIndex].title = trimmed;
      saveBookmarks();
    }
    renamingIndex = -1;
    renameValue = '';
  }

  function handleRenameKeyDown(e) {
    if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
    if (e.key === 'Escape') { renamingIndex = -1; renameValue = ''; }
  }

  function handleScroll() {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      if (ulEl) {
        updatePanel('bookmarks', id, { items: $state.snapshot(items), scrollTop: ulEl.scrollTop });
        scrollSavedText = 'position saved';
        scrollSavedOpacity = 1;
        clearTimeout(scrollSaveTimer);
        scrollSaveTimer = setTimeout(() => { scrollSavedOpacity = 0; }, 1500);
      }
    }, 400);
  }

  function handleUrlBlur() {
    if (urlInput && !titleInput) {
      try {
        let url = urlInput.trim();
        if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
        titleInput = new URL(url).hostname;
        titleInputEl?.select();
      } catch {}
    }
  }

  function handleUrlKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      titleInputEl?.focus();
    }
  }

  function handleTitleKeyDown(e) {
    if (e.key === 'Enter') addBookmark();
  }

  function addBookmark() {
    let url = urlInput.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    let title = titleInput.trim();
    if (!title) {
      try { title = new URL(url).hostname; } catch { title = url; }
    }
    items.push({ url, title });
    saveBookmarks();
    urlInput = '';
    titleInput = '';
    urlInputEl?.focus();
  }

  function handleImport() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.html,.htm';
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(ev.target.result, 'text/html');
        const newItems = [...doc.querySelectorAll('a[href]')]
          .filter(a => /^https?:\/\//i.test(a.getAttribute('href')))
          .map(a => ({ url: a.getAttribute('href'), title: a.textContent.trim() || a.getAttribute('href') }));
        if (!newItems.length) return;
        const newData = {
          id: 'bookmarks-' + Date.now(),
          kind: 'bookmarks',
          items: newItems,
          x: x + 20,
          y: y + 20,
          w,
          h: 340,
        };
        addPanel('bookmarks', newData);
      };
      reader.readAsText(file);
    });
    fileInput.click();
  }

  function handleExport() {
    const snapshot = $state.snapshot(items);
    const lines = [
      '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
      '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
      '<TITLE>Bookmarks</TITLE>',
      '<H1>Bookmarks</H1>',
      '<DL><p>',
      ...snapshot.map(item => `  <DT><A HREF="${item.url}">${item.title}</A>`),
      '</DL><p>',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'bookmarks.html';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function getHostname(url) {
    try { return new URL(url).hostname; } catch { return ''; }
  }
</script>

<Panel {id} kind="bookmarks" {x} {y} {w} {h} title="bookmarks">
  {#snippet headerActions()}
    <button onclick={handleImport} title="import browser bookmarks (.html)">import</button>
    <button onclick={handleExport} title="export as browser bookmarks (.html)">export</button>
  {/snippet}

  {#snippet children()}
    <div style="display:flex;flex-direction:column;overflow:hidden;height:100%;">
      <ul class="bookmark-list" bind:this={ulEl} onscroll={handleScroll}>
        {#each items as item, i (i)}
          <li>
            {#if renamingIndex === i}
              <input
                class="bookmark-title-input"
                bind:value={renameValue}
                onblur={commitRename}
                onkeydown={handleRenameKeyDown}
              />
            {:else}
              <a
                class="bookmark-link"
                href={item.url}
                target="_blank"
                rel="noopener"
                title={item.url}
                ondblclick={(e) => { e.preventDefault(); startRename(i); }}
              >{item.title}</a>
            {/if}
            <span class="bookmark-url">{getHostname(item.url)}</span>
            <button onclick={() => removeItem(i)}>×</button>
          </li>
        {/each}
      </ul>

      <div style="margin-top:0.6rem;padding-top:0.6rem;border-top:1px solid var(--warm);display:flex;flex-direction:column;gap:0.4rem;">
        <input
          class="new-item-input"
          placeholder="url"
          type="url"
          bind:value={urlInput}
          bind:this={urlInputEl}
          onblur={handleUrlBlur}
          onkeydown={handleUrlKeyDown}
        />
        <div style="display:flex;gap:0.6rem;">
          <input
            class="new-item-input"
            placeholder="title (optional)"
            bind:value={titleInput}
            bind:this={titleInputEl}
            onkeydown={handleTitleKeyDown}
          />
          <button onclick={addBookmark}>add</button>
        </div>
      </div>
    </div>
  {/snippet}

  {#snippet overlay()}
    <span
      style="position:absolute;bottom:1.4rem;right:1.4rem;font-size:0.7rem;color:var(--ink);transition:opacity 0.3s;pointer-events:none;z-index:3;opacity:{scrollSavedOpacity};"
    >{scrollSavedText}</span>
  {/snippet}
</Panel>
