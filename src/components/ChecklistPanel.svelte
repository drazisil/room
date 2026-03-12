<script>
  import Panel from './Panel.svelte';
  import { updatePanel } from '../stores/index.js';

  let { id, x, y, w, h, items: initialItems = [], readonly = false } = $props();

  let items = $state(initialItems.map(item => ({ ...item })));
  let newItemText = $state('');

  function saveItems() {
    updatePanel('checklist', id, { items: $state.snapshot(items) });
  }

  function toggleItem(index) {
    items[index].done = !items[index].done;
    saveItems();
  }

  function removeItem(index) {
    items.splice(index, 1);
    saveItems();
  }

  function addItem() {
    const text = newItemText.trim();
    if (!text) return;
    items.push({ text, done: false });
    saveItems();
    newItemText = '';
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') addItem();
  }
</script>

<Panel {id} kind="checklist" {x} {y} {w} {h} title="checklist" {readonly}>
  {#snippet children()}
    <ul class="checklist-items">
      {#each items as item, i (i)}
        <li class:done={item.done}>
          <input
            type="checkbox"
            id="{id}-item-{i}"
            checked={item.done}
            onchange={() => { if (!readonly) toggleItem(i); }}
            disabled={readonly}
          />
          <label for="{id}-item-{i}">{item.text}</label>
          {#if !readonly}<button onclick={() => removeItem(i)}>×</button>{/if}
        </li>
      {/each}
    </ul>
    {#if !readonly}
      <div class="new-item-row">
        <input
          class="new-item-input"
          placeholder="add something"
          bind:value={newItemText}
          onkeydown={handleKeyDown}
        />
        <button onclick={addItem}>add</button>
      </div>
    {/if}
  {/snippet}
</Panel>
