# Overview Builders List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the overview scene's second stat with a two-column list of builder names from `builders.json`, while making the visible count equal the configured builder count.

**Architecture:** The scripts pipeline will load builder names from `builders.json` and include them in the Remotion props payload. The React side will thread that `builderNames` array through `CompositionProps` into `Overview`, which will render one animated count plus a two-column grid of names. Source-level regression tests will lock both the data flow and the scene copy before and after implementation.

**Tech Stack:** Node.js ES modules, Remotion, React, TypeScript, `node:test`

---

## File Map

- `builders.json`
  Source of truth for tracked builders. No format change in this task.
- `scripts/generate-video.js`
  Loads builder names and writes them into `output/remotion-props.json`.
- `video/src/types.ts`
  Extends the composition prop types with `builderNames`.
- `video/src/Root.tsx`
  Supplies default `builderNames` for Studio/dev mode.
- `video/src/VideoComposition.tsx`
  Passes `builderNames` into `Overview`.
- `video/src/components/Overview.tsx`
  Removes the second stat and renders the two-column names list.
- `scripts/tests/overview-builders.test.js`
  Regression tests for the new data flow and overview rendering expectations.

### Task 1: Thread Builder Names Into Remotion Props

**Files:**
- Create: `scripts/tests/overview-builders.test.js`
- Modify: `scripts/generate-video.js`
- Modify: `video/src/types.ts`
- Modify: `video/src/Root.tsx`
- Modify: `video/src/VideoComposition.tsx`

- [ ] **Step 1: Write the failing data-flow test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("generate-video forwards builder names into Remotion props", async () => {
  const source = await readFile("scripts/generate-video.js", "utf8");

  assert.match(source, /import \{ loadBuildersConfig \} from "\.\/lib\/builders-config\.js";/);
  assert.match(
    source,
    /const builderNames = \(await loadBuildersConfig\(\{ rootDir: ROOT \}\)\)\.map\(\(\{ name \}\) => name\);/,
  );
  assert.match(source, /builderNames,/);
});

test("CompositionProps carry builder names into Overview", async () => {
  const typesSource = await readFile("video/src/types.ts", "utf8");
  const rootSource = await readFile("video/src/Root.tsx", "utf8");
  const compositionSource = await readFile("video/src/VideoComposition.tsx", "utf8");

  assert.match(typesSource, /builderNames\?: string\[\];/);
  assert.match(rootSource, /builderNames: \[\],/);
  assert.match(compositionSource, /builderNames=\{builderNames\}/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test scripts/tests/overview-builders.test.js`

Expected: FAIL because `generate-video.js` does not yet load `builderNames`, `CompositionProps` does not yet define them, and `VideoComposition` does not yet pass them into `Overview`.

- [ ] **Step 3: Implement the minimal prop threading**

`scripts/generate-video.js`

```js
import { loadBuildersConfig } from "./lib/builders-config.js";

// inside run(), after loadEnv()
const builderNames = (await loadBuildersConfig({ rootDir: ROOT })).map(({ name }) => name);

const remotionProps = {
  segments: enrichedSegments,
  date,
  stats: {
    builders: stats.xBuilders || 0,
    podcasts: stats.podcastEpisodes || 0,
    blogs: stats.blogPosts || 0,
  },
  builderNames,
};
```

`video/src/types.ts`

```ts
export interface CompositionProps {
  segments: SegmentWithAudio[];
  date: string;
  stats?: { builders: number; podcasts: number; blogs: number };
  builderNames?: string[];
}
```

`video/src/Root.tsx`

```tsx
defaultProps={{
  segments: [],
  date: "2026-03-27",
  stats: { builders: 0, podcasts: 0, blogs: 0 },
  builderNames: [],
}} satisfies CompositionProps
```

`video/src/VideoComposition.tsx`

```tsx
function renderSegment(
  segment: SegmentWithAudio,
  date: string,
  stats: { builders: number; podcasts: number; blogs: number },
  builderNames: string[],
): React.ReactNode {
  switch (segment.type) {
    case "overview":
      return (
        <Overview
          builders={builderNames.length}
          builderNames={builderNames}
        />
      );
  }
}

const resolvedBuilderNames = builderNames ?? [];
renderSegment(segment, date, resolvedStats, resolvedBuilderNames)
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test scripts/tests/overview-builders.test.js`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/tests/overview-builders.test.js scripts/generate-video.js video/src/types.ts video/src/Root.tsx video/src/VideoComposition.tsx
git commit -m "video: thread builder names into overview props"
```

### Task 2: Replace The Second Stat With A Two-Column Builder List

**Files:**
- Modify: `scripts/tests/overview-builders.test.js`
- Modify: `video/src/components/Overview.tsx`

- [ ] **Step 1: Extend the test with the overview layout expectations**

```js
test("Overview renders one builder stat and removes the selected metric", async () => {
  const source = await readFile("video/src/components/Overview.tsx", "utf8");

  assert.match(source, /interface OverviewProps \{\s*builders: number;\s*builderNames: string\[\];/s);
  assert.match(source, /label="构建者"/);
  assert.doesNotMatch(source, /精选动态/);
  assert.match(source, /builderNames\.map/);
  assert.match(source, /gridTemplateColumns: "1fr 1fr"/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test scripts/tests/overview-builders.test.js`

Expected: FAIL because `Overview.tsx` still expects `selected`, still renders the second stat, and does not yet render any name list.

- [ ] **Step 3: Implement the minimal overview layout**

Replace the `selected` prop and second `CountUp` with a name-grid section.

```tsx
interface OverviewProps {
  builders: number;
  builderNames: string[];
}

export const Overview: React.FC<OverviewProps> = ({ builders, builderNames }) => {
  return (
    <AbsoluteFill
      style={{
        background: "transparent",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        gap: theme.spacing.gap * 1.5,
        fontFamily: theme.fonts.primary,
        padding: `120px ${theme.spacing.page}px 180px`,
      }}
    >
      <div /* title */>今日追踪</div>
      <div style={{ width: "100%", maxWidth: 760 }}>
        <CountUp value={builders} label="构建者" delay={0} />
      </div>
      <div
        style={{
          width: "100%",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "14px 28px",
          color: theme.colors.text,
          fontSize: 24,
          lineHeight: 1.25,
        }}
      >
        {builderNames.map((name, index) => (
          <div key={`${index}-${name}`}>{name}</div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
```

If the existing `CountUp` wrapper forces too much horizontal spacing, remove `flex: 1` from its root style so a single stat can stay centered without stretching.

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test scripts/tests/overview-builders.test.js`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/tests/overview-builders.test.js video/src/components/Overview.tsx
git commit -m "video: show builders list in overview"
```

### Task 3: Verify End-To-End Behavior

**Files:**
- Test: `scripts/tests/overview-builders.test.js`
- Test: `scripts/tests/*.test.js`
- Verify: `output/remotion-props.json`

- [ ] **Step 1: Run the focused regression test**

Run: `node --test scripts/tests/overview-builders.test.js`

Expected: PASS

- [ ] **Step 2: Run the full scripts test suite**

Run: `node --test scripts/tests/*.test.js`

Expected: PASS with 0 failures

- [ ] **Step 3: Rebuild the props payload and inspect the overview data**

Run:

```bash
node scripts/generate-video.js --script output/script-with-audio.json --background-dir ./background
```

Expected:
- `output/remotion-props.json` contains `builderNames`
- the overview scene no longer references `精选动态`
- the visible builder count resolves from `builderNames.length`, which should be `20` for the current `builders.json`

- [ ] **Step 4: Stop if verification reveals additional code changes**

If all checks pass, this task ends without a new commit because it only verifies generated output. If any check fails, return to the relevant implementation task, make the minimal fix, and re-run Task 3 from Step 1.
