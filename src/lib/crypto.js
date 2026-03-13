import { storeOwnerVerifier as persistVerifier } from './storage.js';

const PBKDF2_ITERATIONS = 200_000;
const SALT_PREFIX = 'roomcity-v1-';

async function deriveKey(passphrase, slug) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(SALT_PREFIX + slug),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true, // extractable so we can export it as a session auth token
    ['encrypt', 'decrypt']
  );
}

async function exportKeyAsBase64(key) {
  const raw = await crypto.subtle.exportKey('raw', key);
  return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

export async function storeOwnerVerifier(slug, passphrase, address) {
  const key = await deriveKey(passphrase, slug);
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode('roomcity-owner')
  );
  const verifier = {
    iv: btoa(String.fromCharCode(...iv)),
    ct: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
  };
  persistVerifier(slug, verifier, address);
  // Store derived key as session auth token for subsequent write requests
  sessionStorage.setItem(`${slug}:key`, await exportKeyAsBase64(key));
}

// Verifies ownership by sending the derived key to the server.
// The server checks it against the stored ownerVerifier — no verifier data
// is exposed to the client.
export async function verifyOwner(slug, passphrase) {
  const key = await deriveKey(passphrase, slug);
  const keyB64 = await exportKeyAsBase64(key);
  try {
    const resp = await fetch(`/api/rooms/${slug}/verify`, {
      method: 'POST',
      headers: { 'X-Room-Key': keyB64 },
    });
    if (resp.ok) {
      sessionStorage.setItem(`${slug}:key`, keyB64);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function isEditMode(slug) {
  return sessionStorage.getItem(`${slug}:edit`) === '1';
}

export function setEditMode(slug) {
  sessionStorage.setItem(`${slug}:edit`, '1');
}

export function clearEditMode(slug) {
  sessionStorage.removeItem(`${slug}:edit`);
  sessionStorage.removeItem(`${slug}:key`);
}
