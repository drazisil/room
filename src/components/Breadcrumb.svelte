<script>
  let { path, navigate, address } = $props();
  let parts = $derived(path ? path.split('/') : []);
  let copied = $state(false);

  function copyAddress() {
    navigator.clipboard.writeText(address);
    copied = true;
    setTimeout(() => copied = false, 1500);
  }
</script>

<nav id="breadcrumb">
  {#if parts.length === 0}
    <span class="crumb current">{address}</span>
    <button class="copy-address" onclick={copyAddress} title="copy address">
      {copied ? 'copied' : '·'}
    </button>
  {:else}
    <button class="crumb" onclick={() => navigate('')}>{address}</button>
  {/if}

  {#each parts as part, i}
    <span class="sep"> › </span>
    {#if i === parts.length - 1}
      <span class="crumb current">{part}</span>
    {:else}
      {@const crumbPath = parts.slice(0, i + 1).join('/')}
      <button class="crumb" onclick={() => navigate(crumbPath)}>{crumbPath}</button>
    {/if}
  {/each}
</nav>

<style>
  /* Reset button appearance so crumb buttons match crumb spans */
  button.crumb {
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    font: inherit;
    color: inherit;
    cursor: pointer;
  }
</style>
