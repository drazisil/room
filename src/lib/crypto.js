import { getOwnerVerifier, storeOwnerVerifier as persistVerifier } from './storage.js';

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
    false,
    ['encrypt', 'decrypt']
  );
}

export async function storeOwnerVerifier(slug, passphrase) {
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
  persistVerifier(slug, verifier);
}

export async function verifyOwner(slug, passphrase) {
  const verifier = getOwnerVerifier();
  if (!verifier) return false;
  const key = await deriveKey(passphrase, slug);
  const iv = Uint8Array.from(atob(verifier.iv), c => c.charCodeAt(0));
  const ct = Uint8Array.from(atob(verifier.ct), c => c.charCodeAt(0));
  try {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    return new TextDecoder().decode(plain) === 'roomcity-owner';
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
}
