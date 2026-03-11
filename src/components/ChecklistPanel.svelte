<script>
  import Panel from './Panel.svelte';
  import { updatePanel } from '../stores/index.js';

  let { id, x, y, w, h, items: initialItems = [] } = $props();

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

<Panel {id} kind="checklist" {x} {y} {w} {h} title="checklist">
  {#snippet children()}
    <ul class="checklist-items">
      {#each items as item, i (i)}
        <li class:done={item.done}>
          <input
            type="checkbox"
            id="{id}-item-{i}"
            checked={item.done}
            onchange={() => toggleItem(i)}
          />
          <label for="{id}-item-{i}">{item.text}</label>
          <button onclick={() => removeItem(i)}>×</button>
        </li>
      {/each}
    </ul>
    <div class="new-item-row">
      <input
        class="new-item-input"
        placeholder="add something"
        bind:value={newItemText}
        onkeydown={handleKeyDown}
      />
      <button onclick={addItem}>add</button>
    </div>
  {/snippet}
</Panel>
