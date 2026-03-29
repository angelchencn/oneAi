# Tweet Blur Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make tweet scenes render the captured tweet screenshot in front while using assigned images from `background/` as the blurred full-screen backdrop.

**Architecture:** Reuse the existing `VideoBg` contain layout for the screenshot foreground and add a separate `backdropSrc` input so tweet scenes can blur `segment.backdropAsset` while keeping `segment.backgroundAsset` as the centered screenshot. Keep `TweetCard` unchanged and limit behavior changes to tweet scene asset routing.

**Tech Stack:** Node.js tests (`node:test`), React, Remotion, TypeScript

**Environment note:** This checkout has no `.git` metadata, so commit steps are replaced by local verification checkpoints.

---

### Task 1: Write Failing Rendering Tests

**Files:**
- Modify: `scripts/tests/video-scene-backgrounds.test.js`
- Verify: `node --test scripts/tests/video-scene-backgrounds.test.js`

- [ ] **Step 1: Add a failing test for tweet scenes preferring `backdropAsset`**

```js
test("VideoComposition passes tweet backdrop assets into VideoBg separately from screenshots", async () => {
  const source = await readFile("video/src/VideoComposition.tsx", "utf8");

  assert.match(source, /backdropSrc=/);
  assert.match(source, /segment\.type === "tweet"/);
  assert.match(source, /segment\.backdropAsset \?\? segment\.backgroundAsset/);
});
```

- [ ] **Step 2: Keep the existing VideoBg API test but make it prove `backdropSrc` is consumed**

```js
test("VideoBg supports a separate backdrop source for blurred tweet scenes", async () => {
  const source = await readFile("video/src/components/VideoBg.tsx", "utf8");

  assert.match(source, /backdropSrc\?: string/);
  assert.match(source, /const backdropMediaSrc = staticFile\(backdropSrc \?\? src\);/);
  assert.match(source, /fit === "contain" \|\| fit === "blur"/);
});
```

- [ ] **Step 3: Run the targeted test file to verify RED**

Run: `node --test scripts/tests/video-scene-backgrounds.test.js`
Expected: FAIL because `VideoComposition.tsx` and `VideoBg.tsx` do not yet expose the separate tweet backdrop flow.

- [ ] **Step 4: Local checkpoint**

Confirm the test failure points at missing `backdropSrc` usage rather than syntax or path errors.

### Task 2: Implement the Minimal Tweet Backdrop Fix

**Files:**
- Modify: `video/src/components/VideoBg.tsx`
- Modify: `video/src/VideoComposition.tsx`
- Verify: `node --test scripts/tests/video-scene-backgrounds.test.js`

- [ ] **Step 1: Add a separate backdrop input to `VideoBg`**

```tsx
interface VideoBgProps {
  src: string;
  durationInFrames: number;
  children: React.ReactNode;
  fit?: "cover" | "contain" | "blur";
  backdropSrc?: string;
}
```

- [ ] **Step 2: Use `backdropSrc ?? src` for the blurred full-screen layer and keep `src` for the centered contain layer**

```tsx
const mediaSrc = staticFile(src);
const backdropMediaSrc = staticFile(backdropSrc ?? src);

const renderMedia = (resolvedSrc: string, style: React.CSSProperties) => {
  if (isVideo) {
    return <OffthreadVideo src={resolvedSrc} style={style} muted />;
  }

  return <Img src={resolvedSrc} style={style} />;
};
```

```tsx
{needsBlurBackdrop
  ? renderMedia(backdropMediaSrc, {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      filter: fit === "blur"
        ? "blur(32px) brightness(0.32)"
        : "blur(28px) brightness(0.42)",
      transform: "scale(1.08)",
    })
  : renderMedia(mediaSrc, {
      width: "100%",
      height: "100%",
      objectFit: "cover",
    })}
```

```tsx
{fit === "contain" ? (
  <AbsoluteFill
    style={{
      alignItems: "center",
      justifyContent: "center",
      padding: 72,
    }}
  >
    {renderMedia(mediaSrc, {
      width: "100%",
      height: "100%",
      objectFit: "contain",
      borderRadius: 32,
      boxShadow: "0 32px 90px rgba(0, 0, 0, 0.38)",
    })}
  </AbsoluteFill>
) : null}
```

- [ ] **Step 3: Pass tweet `backdropAsset` into `VideoBg` from `VideoComposition`**

```tsx
<VideoBg
  src={segment.backgroundAsset}
  backdropSrc={
    segment.type === "tweet"
      ? segment.backdropAsset ?? segment.backgroundAsset
      : undefined
  }
  durationInFrames={segment.durationInFrames}
  fit={
    segment.type === "tweet"
      ? "contain"
      : segment.type === "podcast" || segment.type === "blog"
        ? "blur"
        : "cover"
  }
>
```

- [ ] **Step 4: Run the targeted test file to verify GREEN**

Run: `node --test scripts/tests/video-scene-backgrounds.test.js`
Expected: PASS

- [ ] **Step 5: Local checkpoint**

Confirm no tweet scene routing logic changed for audio, subtitles, or timing.

### Task 3: Rebuild the Video and Verify Output Artifacts

**Files:**
- Read: `output/script-with-audio.json`
- Regenerate: `release/digest-2026-03-28.mp4`
- Regenerate: `release/digest-2026-03-28.srt`

- [ ] **Step 1: Rebuild from existing local data**

Run: `node scripts/generate-video.js --script output/script-with-audio.json --background-dir background`
Expected: Successful render with 11 TTS segments and a fresh `release/digest-2026-03-28.mp4`

- [ ] **Step 2: Verify the rebuilt artifact exists and is fresh**

Run: `ls -lhT release/digest-2026-03-28.mp4 release/digest-2026-03-28.srt`
Expected: Both files exist with current timestamps.

- [ ] **Step 3: Verify the rendered video duration**

Run: `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 release/digest-2026-03-28.mp4`
Expected: A duration around 122 seconds.

- [ ] **Step 4: Final checkpoint**

Confirm the user-visible tweet scene behavior now matches the approved design:
- screenshot in front
- blurred `background/` image behind
- no added tweet metadata overlays
