# ahackwillslash

A very small browser combat prototype about waking in darkness with a weapon you do not yet know how to use.

The tone target is stark, tense, and physical:

- black background
- short encounter text
- visible health bars
- a tiny combat log
- deliberate clickable attack choices
- risky opportunities to learn better moves

## Current Prototype

The local worktree currently goes beyond the original sword-only MVP.

Implemented now:

- persistent weapon memory via `localStorage`
- turn-based combat with visible player and enemy HP bars
- known moves plus occasional experimental move prompts
- success, failure, and catastrophic learning outcomes
- death and wake-again restart loop
- sword progression fully playable
- additional work-in-progress weapon paths for knife, spear, and axe
- GitHub Pages deployment workflow

Core code lives in `src/app.ts`. Styling lives in `src/style.css`.

## Local Development

Project instructions for this repo:

- use WSL, never PowerShell
- use `nvm` for Node
- use Bun as the package manager

Typical WSL session:

```bash
source ~/.nvm/nvm.sh
bun install
bun run dev
```

Build locally:

```bash
source ~/.nvm/nvm.sh
bun run build
```

## Persistence

Weapon progression is stored in `localStorage` under:

```text
ahackwillslash.weapon-memory.v1
```

Delete that key in the browser if you want a clean progression reset.

## GitHub Pages

This repo includes a GitHub Actions workflow that deploys the built site to GitHub Pages on pushes to `main`.

The workflow:

- installs with `bun install --frozen-lockfile`
- builds with `BASE_PATH=ahackwillslash`
- uploads `dist/` as the Pages artifact

Published URL:

`https://nej-dot.github.io/ahackwillslash/`
