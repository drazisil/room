<script>
  let { x, y, oncreate } = $props();
</script>

<div
  class="ctx-menu visible"
  style:left="{x}px"
  style:top="{y}px"
>
  <button onclick={() => oncreate('notepad')}>notepad</button>
  <button onclick={() => oncreate('checklist')}>checklist</button>
  <button onclick={() => oncreate('bookmarks')}>bookmarks</button>
  <button onclick={() => oncreate('folder')}>folder</button>
</div>
