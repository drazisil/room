# Changelog

All notable changes to this project will be documented here.

## [Unreleased]

### Fixed
- "want your own?" link no longer flickers on the index page (`page` state now initializes to `null` instead of `'room'`)
- "want your own?" link now appears on all room views for non-owners, not just the index page
- `#topbar-actions a` styles added globally so the link doesn't show in browser `:visited` colors
- Room id assignment no longer fires an unauthenticated PATCH (which caused a 403 for visitors on owned rooms)

## [0.0.1] - 2026-03-13 — first public deployment

### Added
- AGPL-3.0 license

### Changed
- Topbar font sizes bumped to 1rem for readability
- Improved text contrast throughout

### Security
- Rate limiting on `/verify` endpoint
- Request logging and referrer suppression
- Server-side auth for all write operations
- Closed rooms invisible to non-owners (404, not 403)
- Input hardening throughout API

---

Older history lives in `git log`.
