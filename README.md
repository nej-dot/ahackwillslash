# ahackwillslash

A fresh starter project using Bun, Vite, and TypeScript.

## Getting started

```bash
bun install
bun run dev
```

## Build

```bash
bun run build
```

## GitHub Pages

This repo includes a GitHub Actions workflow that deploys the built site to GitHub Pages on every push to `main`.
The workflow uses `bun install --frozen-lockfile` and builds with `BASE_PATH=ahackwillslash` so asset URLs resolve correctly on the project site.

To enable it in GitHub:

1. Open `Settings` -> `Pages`.
2. Set `Source` to `GitHub Actions`.
3. Push `main` and wait for the `Deploy GitHub Pages` workflow to finish.

For this repository, the published site URL will be:

`https://nej-dot.github.io/ahackwillslash/`
