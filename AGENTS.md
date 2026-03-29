# Repository Guidelines

## Project Structure & Module Organization
Root scripts orchestrate the pipeline. `scripts/` contains the Node.js fetch, digest, script, and render entry points. `video/` holds the Remotion project: `video/src/components/` for scene components, `video/src/styles/` for shared theme values, and `video/src/utils/` for timing helpers. Prompt templates live in `prompts/`. Generated artifacts are local-only: `data/` for fetched inputs, `output/` for intermediate JSON/audio, and `release/` for final `.mp4` and `.srt` files.

## Build, Test, and Development Commands
Run `npm run install:all` to install both Node workspaces, then `pip3 install -r requirements.txt` for `edge-tts`.

- `npm run fetch`: fetch latest feeds into `data/`.
- `npm run video`: run the full pipeline and write results to `release/`.
- `npm run studio`: open Remotion Studio from `video/src/index.ts`.
- `npm --prefix video run build`: render the video directly to `video/out/video.mp4`.
- `node scripts/generate-video.js --skip-fetch`: rebuild from existing local data.

## Coding Style & Naming Conventions
Follow the existing style: 2-space indentation, semicolons, double quotes, and small focused functions. `scripts/` uses ES modules and lower-kebab-case filenames such as `generate-video.js`. Remotion components and TypeScript types use PascalCase filenames such as `VideoComposition.tsx` and `PodcastCard.tsx`. Keep shared constants in `video/src/styles/theme.ts` or near the script entry point that owns them. No ESLint or Prettier config is checked in, so match surrounding code manually.

## Testing Guidelines
There is no automated test suite yet. Validate changes by running the narrowest relevant command: `npm run fetch` for feed logic, `npm run studio` for composition changes, and `npm run video` for end-to-end verification. For visual edits, confirm output in `release/` and check subtitle timing against `output/script-with-audio.json`.

## Commit & Pull Request Guidelines
This checkout does not include `.git` history, so no repository-specific commit convention can be inferred here. Use short imperative commits with a clear scope, for example `video: tighten intro layout` or `scripts: handle missing background dir`. PRs should describe the user-visible effect, list required env vars or assets, and include screenshots or a short render sample for UI/video changes. Note any manual verification steps you ran.

## Security & Configuration Tips
Keep secrets in `.env`; never commit API tokens or generated media. `data/`, `output/`, `release/`, `video/public/audio/`, and `video/public/backgrounds/` are already ignored and should stay disposable.
