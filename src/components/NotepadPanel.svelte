<script>
  import Panel from './Panel.svelte';
  import { updatePanel } from '../stores/index.js';

  let { id, x, y, w, h, content: initialContent = '', readonly = false } = $props();

  let content = $state(initialContent);
  let savedText = $state('');
  let saveTimer = null;

  function handleInput() {
    clearTimeout(saveTimer);
    savedText = '';
    saveTimer = setTimeout(() => {
      updatePanel('notepad', id, { content });
      savedText = 'saved';
      setTimeout(() => { savedText = ''; }, 2000);
    }, 800);
  }
</script>

<Panel {id} kind="notepad" {x} {y} {w} {h} title="notepad" {readonly}>
  {#snippet children()}
    <textarea
      class="notepad-ta"
      placeholder="anything"
      rows="8"
      bind:value={content}
      oninput={handleInput}
      {readonly}
    ></textarea>
    {#if !readonly}<div class="saved-note">{savedText}</div>{/if}
  {/snippet}
</Panel>
