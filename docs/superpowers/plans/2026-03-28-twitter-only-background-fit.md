# Twitter-Only Background Fit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the video Twitter-only, use user background images for the opening/ending sections, and show tweet screenshots fully without cropping away tweet content.

**Architecture:** Keep script generation focused on `intro`, `overview`, `tweet`, and `outro`, move non-tweet background assignment into a small helper, and let the video background component support a dedicated screenshot-friendly contain mode. Keep tweet screenshot capture unchanged and only alter how those assets are assigned and rendered.

**Tech Stack:** Node.js ES modules, node:test, Remotion, local asset backgrounds

---

### Task 1: Add failing tests for Twitter-only output

**Files:**
- Create: `scripts/tests/generate-script.test.js`

- [ ] Verify `generate-script.js` produces only `intro`, `overview`, `tweet`, and `outro` segments for a mixed digest.
- [ ] Verify generated stats keep podcast/blog counts at zero and overview copy references only Twitter/Builder counts.

### Task 2: Add failing tests for non-tweet background assignment

**Files:**
- Create: `scripts/tests/background-assignment.test.js`
- Create: `scripts/lib/background-assignment.js`

- [ ] Verify intro, overview, and outro consume user-supplied background images first.
- [ ] Verify tweet segments keep their screenshot backgrounds and are not overwritten by generic background images.

### Task 3: Implement Twitter-only script generation

**Files:**
- Modify: `scripts/generate-script.js`

- [ ] Remove podcast/blog curation and segment generation from the script pipeline.
- [ ] Update intro and overview wording so counts and narration reference only Twitter content.

### Task 4: Implement background assignment and screenshot-friendly rendering

**Files:**
- Modify: `scripts/generate-video.js`
- Modify: `video/src/VideoComposition.tsx`
- Modify: `video/src/components/VideoBg.tsx`
- Modify: `video/src/types.ts`

- [ ] Route user background images to intro/overview/outro before any tweet segments.
- [ ] Add a contain-style tweet screenshot mode so the whole screenshot is readable on screen.

### Task 5: Verify

**Files:**
- Modify: `scripts/tests/generate-script.test.js`
- Modify: `scripts/tests/background-assignment.test.js`

- [ ] Run targeted node tests and syntax checks.
- [ ] Run one full `node scripts/generate-video.js --skip-fetch --background-dir ...` verification if local backgrounds are available.
