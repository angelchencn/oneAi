# Remove Mid Tweet Summary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the mid-screen Chinese tweet summary card while keeping the author header and bottom subtitle strip unchanged.

**Architecture:** Keep the tweet scene structure intact and only simplify `TweetCard` so it renders the avatar/name header without the summary card. Use a source-level regression test because the repo has no component test harness, then rerender the daily video and inspect a tweet frame to confirm only the bottom subtitle remains.

**Tech Stack:** Node.js ES modules, `node:test`, Remotion React components

---

### Task 1: Add a failing regression test for the removed summary card

**Files:**
- Modify: `scripts/tests/tweet-card.test.js`

- [ ] Add assertions that the TweetCard source no longer contains the summary-card marker and no longer renders `subtitle`.
- [ ] Run `node --test scripts/tests/tweet-card.test.js`.
- [ ] Confirm the new assertions fail before implementation.

### Task 2: Remove the mid-screen summary card

**Files:**
- Modify: `video/src/components/TweetCard.tsx`

- [ ] Remove the summary card block and any props/state only used by it.
- [ ] Keep the author header and entrance animation intact.
- [ ] Run `node --test scripts/tests/tweet-card.test.js` and confirm it passes.

### Task 3: Verify the rendered video

**Files:**
- Verify: `release/digest-2026-03-28.mp4`

- [ ] Run `node scripts/generate-video.js --skip-fetch --background-dir ./background`.
- [ ] Extract a tweet frame and confirm the mid-screen Chinese text is gone while the bottom subtitle remains.
