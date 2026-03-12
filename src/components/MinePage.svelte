<script>
  import { setCurrentSlug, loadRoom } from '../lib/storage.js';
  import { verifyOwner, setEditMode } from '../lib/crypto.js';

  const savedAddress = localStorage.getItem('room-address');

  let address = $state(savedAddress ?? '');
  let passphrase = $state('');
  let error = $state('');
  let busy = $state(false);

  function slugFromAddress(addr) {
    return addr.trim().toLowerCase().replace(/\s+/g, '-');
  }

  async function submit() {
    if (!address.trim()) { error = 'enter your address'; return; }
    if (!passphrase) { error = 'enter your passphrase'; return; }
    busy = true;
    error = '';
    const slug = slugFromAddress(address);
    try {
      setCurrentSlug(slug);
      await loadRoom();
      const ok = await verifyOwner(slug, passphrase);
      if (ok) {
        setEditMode(slug);
        localStorage.setItem('room-address', address.trim());
        window.location.href = `/${slug}`;
      } else {
        error = 'wrong address or passphrase';
        busy = false;
      }
    } catch (e) {
      console.error('mine: verify failed', e);
      error = 'something went wrong';
      busy = false;
    }
  }
</script>

<div class="mine-wrap">
  <div class="mine-box">
    {#if savedAddress}
      <p class="mine-label">welcome home</p>
      <p class="mine-address">{savedAddress}</p>
      <input type="text" id="username" name="username" autocomplete="username" value={savedAddress} readonly class="hidden-username" tabindex="-1" aria-hidden="true" />
    {:else}
      <p class="mine-hint">enter your address and passphrase to tend your room. no account, no email — the passphrase is how we know it's you.</p>
      <input
        type="text"
        id="username"
        name="username"
        autocomplete="username"
        placeholder="your address"
        bind:value={address}
        disabled={busy}
        onkeydown={e => e.key === 'Enter' && submit()}
        autofocus
      />
    {/if}
    <input
      type="password"
      autocomplete="current-password"
      placeholder="passphrase"
      bind:value={passphrase}
      disabled={busy}
      onkeydown={e => e.key === 'Enter' && submit()}
      autofocus={!!savedAddress}
    />
    {#if error}
      <p class="mine-error">{error}</p>
    {/if}
    <div class="mine-actions">
      <button class="primary" onclick={submit} disabled={busy}>
        {busy ? 'checking…' : 'enter'}
      </button>
      <a href="/join">new room instead</a>
    </div>
  </div>
</div>

<style>
  .mine-wrap {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .mine-box {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-width: 28rem;
    width: 100%;
    padding: 0 2rem;
  }

  .mine-label {
    font-size: 0.75rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--faint);
  }

  .mine-address {
    font-size: 1.6rem;
    color: var(--ink);
    line-height: 1.3;
  }

  .hidden-username {
    position: absolute;
    opacity: 0;
    pointer-events: none;
    width: 0;
    height: 0;
    padding: 0;
    border: none;
  }

  .mine-hint {
    font-size: 0.85rem;
    color: var(--faint);
    line-height: 1.6;
  }

  input[type="text"],
  input[type="password"] {
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--warm);
    padding: 0.4rem 0;
    font-family: inherit;
    font-size: 1rem;
    color: var(--ink);
    outline: none;
    width: 100%;
  }

  input[type="text"]::placeholder,
  input[type="password"]::placeholder { color: var(--faint); }

  input[type="text"]:focus,
  input[type="password"]:focus { border-bottom-color: var(--faint); }

  .mine-error {
    font-size: 0.8rem;
    color: var(--faint);
  }

  .mine-actions {
    display: flex;
    align-items: baseline;
    gap: 1.5rem;
    margin-top: 0.5rem;
  }

  button {
    font-size: 0.85rem;
    letter-spacing: 0.06em;
    color: var(--faint);
    cursor: pointer;
  }

  button:hover:not(:disabled) { color: var(--ink); }
  button:disabled { opacity: 0.4; cursor: default; }
  button.primary { color: var(--ink); }
  button.primary:hover:not(:disabled) { color: #fff; }

  a {
    font-size: 0.85rem;
    color: var(--faint);
    text-decoration: none;
  }

  a:hover { color: var(--ink); }
</style>
