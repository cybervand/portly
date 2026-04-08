# Portly — Claude Code Context

## What this is

A **Cockpit plugin** (not a standalone web app) that manages Docker containers. It runs inside Cockpit's web frame at `https://<server>:9090`. There is no build step, no bundler, no npm — all files are plain HTML/CSS/JS served directly by Cockpit's web server.

## Architecture

Two-layer split with a clean boundary:

```
ui/         Visual layer — CSS, DOM rendering, dark mode, modals, menus
backend/    Logic layer — Docker CLI access and orchestration
```

### UI layer (`ui/`)
Each module exposes its API on `window.Portly` (e.g. `Portly.render`, `Portly.textViewer`, `Portly.kebab`). Load order in `index.html` matters — modules must be included before anything that depends on them.

| File | Responsibility |
|------|----------------|
| `darkmode.js` | Syncs with Cockpit's theme |
| `ports.js` | Port string parsing + HTTP/HTTPS toggle |
| `textviewer.js` | Generic modal for logs and compose files |
| `modals.js` | Confirm/delete dialog (`Portly.confirm`) |
| `kebab.js` | Three-dot context menu (`Portly.kebab`) |
| `render.js` | Table rendering, section toggling, button state |

### Backend layer (`backend/`)

| File | Responsibility |
|------|----------------|
| `docker.js` | Thin CLI wrapper — one function per `docker` command, returns the cockpit proc |
| `containers.js` | Higher-level ops: update-with-rollback, compose file resolution, output parsing |
| `main.js` | Controller — wires UI to backend, action map, refresh cycle, Escape handler |

`main.js` must be loaded last. `containers.js` lazily resolves `Portly.docker` so load order within backend doesn't matter.

## Key patterns

- **All Docker commands** go through `cockpit.spawn([...], { superuser: 'try' })` — never shell strings, always argument arrays (no injection risk).
- **CSP-compliant**: no inline styles, no inline event handlers, no `eval`. All styles in external CSS files.
- **Callbacks** (not Promises) used throughout: `{ onStart, onSuccess, onError, onComplete }`.
- **Module pattern**: every JS file is an IIFE with `'use strict'`, exports onto `window.Portly`.
- **PatternFly 6** CSS classes (`pf-v6-c-*`, `pf-v6-u-*`, `pf-m-*`) — do not use PF4/PF5 class names.
- **ES5 only** — no arrow functions, no `let`/`const`, no template literals, no destructuring. Cockpit's browser target may be older.

## Update flow (containers.js)

`updateContainer` does: inspect → pull → stop (if running) → rename to `_portly_backup` → `docker run` with rebuilt args → rm backup. On any failure after rename, it rolls back by renaming the backup back and restarting it.

## Installation / testing

No local dev server. To test changes:
- Copy files to `/usr/share/cockpit/portly/` (system) or `~/.local/share/cockpit/portly/` (user)
- Hard-refresh the browser (`Ctrl+Shift+R`) — Cockpit does not hot-reload
- Check the browser console for JS errors

## Version

Currently `v0.1.0` (set in `backend/main.js` `VERSION` constant).
