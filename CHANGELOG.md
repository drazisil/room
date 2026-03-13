# Changelog

All notable changes to this project will be documented here.
Versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] - 2026-03-13

### Added
- `/about` page with full vision document
- "what is roomcity.org?" link on `/join`
- "i have a room" link in topbar and index for non-owners
- "want your own?" link now appears on all room views, not just the index
- Editing instructions on `/manage`
- Server event log at `/var/log/roomcity/app.log` (room created, deleted, verify ok/fail)

### Fixed
- "want your own?" link no longer flickers on page load (`page` state initializes to `null`)
- `:visited` link color no longer overrides topbar link styles
- Room id assignment no longer fires an unauthenticated PATCH (caused 403 for visitors)
- Room creation now sends `ownerVerifier` and `address` in a single PATCH, eliminating a race condition that could lose the ownerVerifier on empty rooms

### Changed
- Deploy script at `../infra/deploy-roomcity.sh` replaces manual SCP

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
