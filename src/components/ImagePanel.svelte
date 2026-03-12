<script>
  import Panel from './Panel.svelte';

  let { id, x, y, w, h, src, readonly = false } = $props();
</script>

<Panel {id} kind="image" {x} {y} {w} {h} title="image" extraClass="image-panel" {readonly}>
  {#snippet children()}
    <img {src} draggable="false" alt="" style="width:100%;height:100%;object-fit:contain;display:block;" />
  {/snippet}
</Panel>
