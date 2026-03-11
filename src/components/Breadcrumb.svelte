<script>
  import { getAddress } from '../lib/address.js';

  let { path, navigate } = $props();

  const address = getAddress();
  let parts = $derived(path ? path.split('/') : []);
  let copied = $state(false);

  function copyAddress() {
    navigator.clipboard.writeText(address);
    copied = true;
    setTimeout(() => copied = false, 1500);
  }
</script>

<nav id="breadcrumb">
  <span
    class="crumb"
    class:current={parts.length === 0}
    onclick={parts.length > 0 ? () => navigate('') : undefined}
  >{address}</span>

  {#if parts.length === 0}
    <button class="copy-address" onclick={copyAddress} title="copy address">
      {copied ? 'copied' : '·'}
    </button>
  {/if}

  {#each parts as part, i}
    <span class="sep"> › </span>
    {#if i === parts.length - 1}
      <span class="crumb current">{part}</span>
    {:else}
      {@const crumbPath = parts.slice(0, i + 1).join('/')}
      <span class="crumb" onclick={() => navigate(crumbPath)}>{crumbPath}</span>
    {/if}
  {/each}
</nav>
