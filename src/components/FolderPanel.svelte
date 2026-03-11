<script>
  import { onMount } from 'svelte';
  import Panel from './Panel.svelte';
  import { updatePanel } from '../stores/index.js';
  import { currentPath } from '../stores/index.js';
  import { renamePath } from '../lib/storage.js';
  import { get } from 'svelte/store';

  let { id, x, y, w, h, name: initialName, navigate, autoRename = false, onclearautorename } = $props();

  let name = $state(initialName);
  let renaming = $state(false);
  let renameValue = $state('');
  let renameInputEl = $state(null);

  function getChildPath(folderName) {
    const path = get(currentPath);
    return path ? `${path}/${folderName}` : folderName;
  }

  function openFolder() {
    navigate(getChildPath(name));
  }

  function startRename(e) {
    if (e) e.stopPropagation();
    renaming = true;
    renameValue = name;
    setTimeout(() => {
      renameInputEl?.focus();
      renameInputEl?.select();
    }, 0);
  }

  function commitRename() {
    const newName = renameValue.trim() || name;
    if (newName !== name) {
      const oldChildPath = getChildPath(name);
      const newChildPath = getChildPath(newName);
      renamePath(oldChildPath, newChildPath);
      name = newName;
      updatePanel('folder', id, { name: newName });
    }
    renaming = false;
    if (onclearautorename) onclearautorename();
  }

  function handleRenameKeyDown(e) {
    if (e.key === 'Enter') { e.preventDefault(); renameInputEl?.blur(); }
    if (e.key === 'Escape') { renameValue = name; renameInputEl?.blur(); }
  }

  onMount(() => {
    if (autoRename) {
      setTimeout(() => startRename(null), 50);
    }
  });
</script>

<Panel {id} kind="folder" {x} {y} {w} {h} title="" extraClass="folder-panel">
  {#snippet headerActions()}
    <span
      style="color:var(--faint);font-size:0.7rem;flex-shrink:0;cursor:pointer;"
      title="open"
      onclick={openFolder}
      role="button"
      tabindex="0"
      onkeydown={(e) => { if (e.key === 'Enter') openFolder(); }}
    >▸</span>
    {#if renaming}
      <input
        class="folder-name-input"
        bind:value={renameValue}
        bind:this={renameInputEl}
        onblur={commitRename}
        onkeydown={handleRenameKeyDown}
      />
    {:else}
      <span
        class="folder-name"
        title="double-click to rename"
        ondblclick={startRename}
        role="button"
        tabindex="0"
        onkeydown={(e) => { if (e.key === 'Enter') startRename(e); }}
      >{name}</span>
    {/if}
  {/snippet}

  {#snippet children()}
    <div
      style="font-size:0.75rem;color:var(--faint);cursor:pointer;"
      onclick={openFolder}
      role="button"
      tabindex="0"
      onkeydown={(e) => { if (e.key === 'Enter') openFolder(); }}
    >open</div>
  {/snippet}
</Panel>
