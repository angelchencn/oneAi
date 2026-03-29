# Cycle Background Reuse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `intro`, `overview`, and `outro` always use images from `background/`, reusing available images in order when fewer than three exist.

**Architecture:** Keep the existing tweet screenshot assignment unchanged and only update the non-tweet background helper to assign local background assets by segment order with wraparound. Verify the new behavior first with a focused node test, then rerender the daily video and inspect a frame from the overview section.

**Tech Stack:** Node.js ES modules, `node:test`, Remotion render pipeline

---

### Task 1: Cover cyclic non-tweet background reuse with a failing test

**Files:**
- Modify: `scripts/tests/background-assignment.test.js`

- [ ] Add a test case where `intro`, `overview`, and `outro` are the only non-tweet segments and only two background images are available.
- [ ] Assert that `intro` gets the first image, `overview` gets the second image, and `outro` wraps back to the first image.
- [ ] Run `node --test scripts/tests/background-assignment.test.js`.
- [ ] Confirm the new test fails before implementation.

### Task 2: Implement cyclic background assignment

**Files:**
- Modify: `scripts/lib/background-assignment.js`

- [ ] Replace the fixed `assetByType` mapping with sequential assignment across non-tweet segments.
- [ ] Preserve existing tweet screenshot backgrounds by skipping segments that already have `backgroundAsset`.
- [ ] Use modulo indexing so any number of non-tweet segments can reuse the available images in order.
- [ ] Run `node --test scripts/tests/background-assignment.test.js` and confirm all tests pass.

### Task 3: Verify the daily render

**Files:**
- Verify: `output/script-with-audio.json`
- Verify: `release/digest-2026-03-28.mp4`

- [ ] Run `node scripts/generate-video.js --skip-fetch --background-dir ./background`.
- [ ] Inspect `output/script-with-audio.json` and confirm `intro`, `overview`, and `outro` each have a `backgroundAsset`.
- [ ] Extract a frame from the overview time window and confirm it uses a background image instead of black.
