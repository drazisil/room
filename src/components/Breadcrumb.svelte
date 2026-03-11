<script>
  let { path, navigate } = $props();

  let parts = $derived(path ? path.split('/') : []);
</script>

<nav id="breadcrumb">
  <span
    class="crumb"
    class:current={parts.length === 0}
    onclick={parts.length > 0 ? () => navigate('') : undefined}
    role={parts.length > 0 ? 'button' : undefined}
    tabindex={parts.length > 0 ? 0 : undefined}
    onkeydown={parts.length > 0 ? (e) => { if (e.key === 'Enter') navigate(''); } : undefined}
  >the room</span>

  {#each parts as part, i}
    <span class="sep"> › </span>
    {#if i === parts.length - 1}
      <span class="crumb current">{part}</span>
    {:else}
      {@const crumbPath = parts.slice(0, i + 1).join('/')}
      <span
        class="crumb"
        onclick={() => navigate(crumbPath)}
        role="button"
        tabindex="0"
        onkeydown={(e) => { if (e.key === 'Enter') navigate(crumbPath); }}
      >{part}</span>
    {/if}
  {/each}
</nav>
