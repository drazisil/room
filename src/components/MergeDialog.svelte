<script>
  let { onmerge, onreplace, oncancel } = $props();
</script>

<div style="position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);">
  <div style="background:var(--surface);border:1px solid var(--faint);padding:1.5rem 2rem;display:flex;flex-direction:column;gap:1rem;min-width:260px;">
    <p style="font-size:0.85rem;color:var(--ink);line-height:1.5;">
      This room already has content. Replace it or merge with it?
    </p>
    <div style="display:flex;gap:1rem;justify-content:flex-end;">
      <button style="font-size:0.8rem;" onclick={oncancel}>cancel</button>
      <button style="font-size:0.8rem;" onclick={onmerge}>merge</button>
      <button
        style="font-size:0.8rem;color:var(--paper);background:var(--ink);padding:0.2rem 0.6rem;"
        onclick={onreplace}
      >replace</button>
    </div>
  </div>
</div>
