# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Vite dev server with API middleware + SPA fallback
npm run build     # Production build to dist/
npm run start     # Production server (node server/index.js, serves dist/)
npm run preview   # Preview the production build via Vite
```

No test framework is configured. There are no test commands.

## Architecture

### Two-environment API setup

In dev, Vite plugins in `vite.config.js` mount `server/api.js` at `/api` and rewrite all non-asset paths to `/` for the SPA. In production, `server/index.js` (plain Node.js `http`) serves `dist/` as static files and routes `/api/` requests to the same handler. The API handler in `server/api.js` exports both `createApiMiddleware()` (for Vite) and `handleApiRequest()` (for the production server).

### Storage

Room data lives in `data/{slug}.json`. There is no database. The shape is:

```json
{ "address", "id", "ownerVerifier", "open", "store": { "[kind]": { "[path]": [...panels] } } }
```

`PATCH /rooms/:slug` does a kind+path-level merge (not a full replace). The client (`src/lib/storage.js`) keeps a `_roomCache` in memory; reads are synchronous from cache, writes are fire-and-forget PATCH calls. The cache is populated once when the slug changes.

### Frontend routing

`src/App.svelte` reads `window.location.pathname` and uses `history.pushState` / `popstate` for navigation. No router library. Routes:

- `/` → IndexPage (random open room, read-only)
- `/join` → JoinPage (address candidate + passphrase onboarding)
- `/mine` → MinePage (look up your room by address + passphrase)
- `/manage` → ManagePage (open toggle, export, import, delete)
- `/{slug}` or `/{slug}/...` → room view or nested folder

### Edit mode and ownership

Ownership is verified **server-side**. The client derives an AES-GCM key from the passphrase+slug via PBKDF2 (`src/lib/crypto.js`), exports the raw key bytes as base64, and posts them to `POST /api/rooms/:slug/verify`. The server decrypts the stored `ownerVerifier` with that key and confirms the plaintext. `ownerVerifier` is never sent to clients in any API response.

On successful verify, the derived key is stored in `sessionStorage['{slug}:key']` and used as a bearer token (`X-Room-Key` header) on all subsequent write requests (PATCH, DELETE) and room loads. `sessionStorage['{slug}:edit'] = '1'` gates the edit UI.

All panels accept a `readonly` prop; when not in edit mode all panels are fully read-only (no drag/resize/delete/context menu). Only the owner (edit mode) sees the "manage" link.

### Open / closed rooms

"Open" means the room appears on `/` (the random index) and is publicly readable. "Closed" (the default) means the room is completely invisible: `GET /rooms/:slug` returns 404 to anyone without a valid `X-Room-Key`. The room's existence is not revealed. The owner can still load their closed room because `loadRoom()` sends the session key.

### Svelte 5 runes

The entire frontend uses Svelte 5 rune syntax: `$state`, `$derived`, `$props`, `$effect`. Do not use the older `export let`, `$:`, or Svelte 4 store subscription patterns.

### Panel system

Panels are Svelte components rendered by `src/App.svelte` based on kind. Each panel type (notepad, checklist, bookmarks, image, folder) has its own component under `src/components/`. All accept a `readonly` prop. Drag and resize are implemented as Svelte actions in `src/lib/actions.js`.

### Address / slug

`src/lib/address.js` generates memorable room addresses (e.g. "14 Wren Lane") and derives the slug (e.g. `14-wren-lane`). The user's home room slug is bookmarked in `localStorage` under `room-address`. Nothing else belongs in `localStorage`.
