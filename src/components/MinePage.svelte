<script>
  import { setCurrentSlug } from '../lib/storage.js';
  import { loadRoom } from '../lib/storage.js';
  import { verifyOwner, setEditMode } from '../lib/crypto.js';

  let address = $state('');
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
    <p class="mine-hint">enter your address and passphrase to tend your room. no account, no email — the passphrase is how we know it's you.</p>
    <input
      type="text"
      placeholder="your address"
      bind:value={address}
      disabled={busy}
      onkeydown={e => e.key === 'Enter' && submit()}
      autofocus
    />
    <input
      type="password"
      placeholder="passphrase"
      bind:value={passphrase}
      disabled={busy}
      onkeydown={e => e.key === 'Enter' && submit()}
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
