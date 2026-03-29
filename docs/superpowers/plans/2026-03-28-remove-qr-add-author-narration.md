# Remove QR And Add Author Narration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the QR code from tweet scenes and make every tweet narration explicitly mention the tweet author.

**Architecture:** Keep the visual tweet card structure intact except for deleting the QR block, and update tweet segment generation so the spoken `text` is prefixed with the author name in Chinese. Cover the script change with a node test against `generate-script.js`, and cover the QR removal with a focused source-level regression test on `TweetCard.tsx` because the repo has no component test harness.

**Tech Stack:** Node.js ES modules, `node:test`, Remotion React components

---

### Task 1: Add failing tests for author-prefixed narration and QR removal

**Files:**
- Modify: `scripts/tests/generate-script.test.js`
- Create: `scripts/tests/tweet-card.test.js`

- [ ] Add a test that generates a tweet segment and asserts its `text` contains the builder name.
- [ ] Add a test that reads `video/src/components/TweetCard.tsx` and asserts QR-specific code strings are absent.
- [ ] Run `node --test scripts/tests/generate-script.test.js scripts/tests/tweet-card.test.js`.
- [ ] Confirm the new assertions fail before implementation.

### Task 2: Implement the script and component updates

**Files:**
- Modify: `scripts/generate-script.js`
- Modify: `video/src/components/TweetCard.tsx`
- Modify: `video/src/VideoComposition.tsx`

- [ ] Prefix each tweet segment narration with the author name while preserving the existing summary content.
- [ ] Remove the QR code import, props, and rendered block from `TweetCard`.
- [ ] Stop passing `qrUrl` into `TweetCard` from `VideoComposition`.
- [ ] Run `node --test scripts/tests/generate-script.test.js scripts/tests/tweet-card.test.js` and confirm all tests pass.

### Task 3: Verify the final render

**Files:**
- Verify: `output/script-with-audio.json`
- Verify: `release/digest-2026-03-28.mp4`

- [ ] Run `node scripts/generate-video.js --skip-fetch --background-dir ./background`.
- [ ] Inspect `output/script-with-audio.json` and confirm tweet segment `text` fields start with builder names.
- [ ] Extract a tweet frame from the rendered video and confirm the QR code no longer appears.
