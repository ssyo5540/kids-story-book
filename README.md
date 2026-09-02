# Nightlight Tales

Bedtime stories from Indian, Greek and Egyptian mythology, read softly in many voices and languages.
A storybook-themed Next.js app with Google Chirp 3 HD narration, offline downloads and a sleep timer.

## Quick start

```bash
nvm use            # Node 24 (see .nvmrc); corepack provides pnpm 10
pnpm install
cp .env.example .env.local   # defaults: fake TTS driver, local storage, unreviewed stories shown
pnpm assets:make   # silence clip, ambience loops, cover PNGs, PWA icons
pnpm dev
```

Everything runs with `TTS_DRIVER=fake` until you deliberately switch to Google — no credentials, no spend.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js. `build` validates content first. |
| `pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm test:e2e` | Biome, `tsc`, Vitest, Playwright |
| `pnpm content:validate --stats` | Validate stories; word counts, hashes and review status per language |
| `pnpm audio:generate --locale en-IN --voice default [--story id] [--dry-run] [--allow-unreviewed]` | Pre-generate default renditions (dry run prints the character cost first) |
| `pnpm audio:previews [--verify-voices]` | Short preview clip per voice per language |
| `pnpm audio:sample --story id --locale te-IN --paragraphs 0-2` | Cheap local listen for reviewers |
| `pnpm audio:status [--calibrate]` | Budget, renditions, missing defaults, stale items |
| `pnpm audio:gc --dry-run` | Remove superseded audio objects |
| `pnpm assets:make` | Regenerate static assets |

## Content

Stories live in `content/stories/<collection>/<story-id>/` as `story.yaml` + one Markdown file per language.
Read `content/STYLE_GUIDE.md`, `content/PROMPTS.md` and `content/GLOSSARY.md`. A story is published only when
its English text is `approved`; translations show when `approved` (or `needs_review` with
`CONTENT_INCLUDE_UNREVIEWED=true`).

## Audio pipeline

Text → sentence-aware chunks (≤ 4,500 bytes) → Chirp 3 HD (LINEAR16) → ffmpeg → one MP3 + a JSON timing
manifest per `{story, locale, voice}` in storage (`local` for dev, Google Cloud Storage in production).
Default voices are pre-generated with `audio:generate`; other voices are generated lazily on first request and
cached forever. A monthly character ledger (`TTS_MONTHLY_CHAR_BUDGET`) is the hard stop on spend.

## Deploy

See `docs/gcp-setup.md` (Google Cloud project, bucket, service account, quotas, budget alerts) and
`docs/railway.md` (Dockerfile, variables, IaC). Health: `GET /api/health`. Admin usage: `GET /api/admin/usage`
with `Authorization: Bearer $ADMIN_TOKEN`.

## Licences

Application code: see `LICENSE` (add one before publishing). Third-party notices in `NOTICE.md`, media credits in
`CREDITS.md`.
