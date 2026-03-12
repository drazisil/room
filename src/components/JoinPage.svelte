<script>
  import { generateAddress } from '../lib/address.js';
  import { storeOwnerVerifier, setEditMode } from '../lib/crypto.js';
  import { setAddressForSlug } from '../lib/storage.js';

  let { onjoined } = $props();

  let candidate = $state(generateAddress());
  let step = $state('choose'); // 'choose' | 'passphrase'
  let passphrase = $state('');
  let confirm = $state('');
  let busy = $state(false);
  let error = $state('');

  function reroll() {
    candidate = generateAddress();
  }

  function accept() {
    step = 'passphrase';
  }

  async function submit() {
    error = '';
    if (!passphrase) { error = 'enter a passphrase'; return; }
    if (passphrase !== confirm) { error = "passphrases don't match"; return; }
    busy = true;
    try {
      const slug = candidate.toLowerCase().replace(/\s+/g, '-');
      await storeOwnerVerifier(slug, passphrase);
      setAddressForSlug(slug, candidate);
      setEditMode(slug);
      onjoined(slug);
    } catch (e) {
      console.error('join failed', e);
      error = 'something went wrong';
      busy = false;
    }
  }
</script>

<div class="join-wrap">
  {#if step === 'choose'}
    <div class="join-box">
      <p class="join-label">your address</p>
      <p class="join-address">{candidate}</p>
      <div class="join-actions">
        <button onclick={reroll}>try another</button>
        <button class="primary" onclick={accept}>this is my place</button>
      </div>
    </div>
  {:else}
    <div class="join-box">
      <p class="join-label">moving in to</p>
      <p class="join-address">{candidate}</p>
      <p class="join-hint">choose a passphrase. write it down. we can't recover it.</p>
      <div class="join-fields">
        <input
          type="password"
          placeholder="passphrase"
          bind:value={passphrase}
          disabled={busy}
          onkeydown={e => e.key === 'Enter' && submit()}
        />
        <input
          type="password"
          placeholder="confirm"
          bind:value={confirm}
          disabled={busy}
          onkeydown={e => e.key === 'Enter' && submit()}
        />
      </div>
      {#if error}
        <p class="join-error">{error}</p>
      {/if}
      <div class="join-actions">
        <button onclick={() => { step = 'choose'; error = ''; }} disabled={busy}>back</button>
        <button class="primary" onclick={submit} disabled={busy}>
          {busy ? 'one moment…' : 'move in'}
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .join-wrap {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .join-box {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-width: 28rem;
    width: 100%;
    padding: 0 2rem;
  }

  .join-label {
    font-size: 0.75rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--faint);
  }

  .join-address {
    font-size: 1.6rem;
    color: var(--ink);
    line-height: 1.3;
  }

  .join-hint {
    font-size: 0.85rem;
    color: var(--faint);
    line-height: 1.5;
  }

  .join-fields {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .join-fields input {
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

  .join-fields input::placeholder { color: var(--faint); }
  .join-fields input:focus { border-bottom-color: var(--faint); }

  .join-actions {
    display: flex;
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

  .join-error {
    font-size: 0.8rem;
    color: var(--faint);
  }
</style>
