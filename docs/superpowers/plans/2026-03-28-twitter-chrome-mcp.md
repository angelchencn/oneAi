# Twitter Chrome MCP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Apify-based X fetch path with a Chrome MCP-based daily fetch that archives normalized JSON, project-owned HTML, and saved images under `data/` while preserving `data/feed-x.json` for the existing digest pipeline.

**Architecture:** Keep `scripts/fetch-feeds.js` as the orchestration entry point, but move X-specific work into focused helpers for MCP transport, X page extraction, archive storage, and HTML rendering. The fetch run should fail loudly if the local Chrome MCP server is unavailable, continue on per-account extraction errors, and export the same downstream `feed-x.json` contract used today.

**Tech Stack:** Node.js ES modules, built-in `fetch`, local Chrome MCP Streamable HTTP endpoint, no new runtime service beyond the user's installed `mcp-chrome-bridge`.

---

### Task 1: Add focused tests for X archive and compatibility helpers

**Files:**
- Create: `scripts/tests/x-html.test.js`
- Create: `scripts/tests/x-storage.test.js`
- Create: `scripts/tests/x-feed-export.test.js`

- [ ] **Step 1: Write the failing HTML archive test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { renderAccountHtml } from "../lib/render-x-html.js";

test("renderAccountHtml includes tweet text and relative image paths", () => {
  const html = renderAccountHtml({
    date: "2026-03-28",
    generatedAt: "2026-03-28T10:00:00.000Z",
    name: "Andrej Karpathy",
    handle: "karpathy",
    tweets: [
      {
        id: "1",
        text: "Hello world",
        createdAt: "2026-03-28T08:00:00.000Z",
        url: "https://x.com/karpathy/status/1",
        likes: 5,
        retweets: 2,
        replies: 0,
        images: [
          {
            localPath: "x-assets/2026-03-28/karpathy/1-1.jpg",
            url: "https://example.com/1.jpg",
            alt: "cover",
          },
        ],
      },
    ],
  });

  assert.match(html, /Andrej Karpathy/);
  assert.match(html, /Hello world/);
  assert.match(html, /x-assets\/2026-03-28\/karpathy\/1-1\.jpg/);
});
```

- [ ] **Step 2: Run the HTML archive test to verify it fails**

Run: `node --test scripts/tests/x-html.test.js`
Expected: FAIL because `../lib/render-x-html.js` does not exist yet.

- [ ] **Step 3: Write the failing storage helper test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { buildDailyPaths, sanitizeHandle } from "../lib/x-storage.js";

test("buildDailyPaths returns stable date-partitioned archive paths", () => {
  const paths = buildDailyPaths({
    date: "2026-03-28",
    handle: "karpathy",
  });

  assert.equal(paths.rawFile, "x-raw/2026-03-28/karpathy.json");
  assert.equal(paths.htmlFile, "x-html/2026-03-28/karpathy.html");
  assert.equal(paths.assetDir, "x-assets/2026-03-28/karpathy");
  assert.equal(sanitizeHandle("@karpathy"), "karpathy");
});
```

- [ ] **Step 4: Run the storage helper test to verify it fails**

Run: `node --test scripts/tests/x-storage.test.js`
Expected: FAIL because `../lib/x-storage.js` does not exist yet.

- [ ] **Step 5: Write the failing feed export test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { buildFeedX } from "../lib/x-feed-export.js";

test("buildFeedX preserves downstream-compatible feed-x.json shape", () => {
  const feed = buildFeedX({
    generatedAt: "2026-03-28T10:00:00.000Z",
    lookbackHours: 24,
    accounts: [
      {
        source: "x",
        name: "Andrej Karpathy",
        handle: "karpathy",
        bio: "",
        avatarUrl: "",
        tweets: [{ id: "1", text: "Hello", createdAt: "2026-03-28T08:00:00.000Z", url: "https://x.com/karpathy/status/1", likes: 1, retweets: 0, replies: 0, images: [] }],
      },
    ],
  });

  assert.equal(feed.x.length, 1);
  assert.equal(feed.stats.xBuilders, 1);
  assert.equal(feed.stats.totalTweets, 1);
});
```

- [ ] **Step 6: Run the feed export test to verify it fails**

Run: `node --test scripts/tests/x-feed-export.test.js`
Expected: FAIL because `../lib/x-feed-export.js` does not exist yet.

### Task 2: Implement archive rendering, storage, and feed export helpers

**Files:**
- Create: `scripts/lib/render-x-html.js`
- Create: `scripts/lib/x-storage.js`
- Create: `scripts/lib/x-feed-export.js`
- Test: `scripts/tests/x-html.test.js`
- Test: `scripts/tests/x-storage.test.js`
- Test: `scripts/tests/x-feed-export.test.js`

- [ ] **Step 1: Write minimal HTML renderer**

```js
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderAccountHtml(account) {
  const items = account.tweets.map((tweet) => {
    const images = (tweet.images || [])
      .map((image) => `<img src="../${escapeHtml(image.localPath)}" alt="${escapeHtml(image.alt || "")}" loading="lazy" />`)
      .join("");

    return `
      <article class="tweet">
        <time datetime="${escapeHtml(tweet.createdAt)}">${escapeHtml(tweet.createdAt)}</time>
        <a href="${escapeHtml(tweet.url)}">${escapeHtml(tweet.url)}</a>
        <p>${escapeHtml(tweet.text)}</p>
        <div class="images">${images}</div>
      </article>
    `;
  }).join("");

  return `<!doctype html><html><body><h1>${escapeHtml(account.name)}</h1><h2>@${escapeHtml(account.handle)}</h2>${items}</body></html>`;
}
```

- [ ] **Step 2: Write minimal storage helpers**

```js
export function sanitizeHandle(handle) {
  return String(handle || "").replace(/^@+/, "").trim();
}

export function buildDailyPaths({ date, handle }) {
  const cleanHandle = sanitizeHandle(handle);
  return {
    rawFile: `x-raw/${date}/${cleanHandle}.json`,
    htmlFile: `x-html/${date}/${cleanHandle}.html`,
    assetDir: `x-assets/${date}/${cleanHandle}`,
  };
}
```

- [ ] **Step 3: Write minimal feed export helper**

```js
export function buildFeedX({ generatedAt, lookbackHours, accounts }) {
  return {
    generatedAt,
    lookbackHours,
    x: accounts,
    stats: {
      xBuilders: accounts.filter((account) => account.tweets.length > 0).length,
      totalTweets: accounts.reduce((sum, account) => sum + account.tweets.length, 0),
    },
  };
}
```

- [ ] **Step 4: Run the focused tests and verify they pass**

Run: `node --test scripts/tests/x-html.test.js scripts/tests/x-storage.test.js scripts/tests/x-feed-export.test.js`
Expected: PASS

### Task 3: Add a Chrome MCP client wrapper and X extraction logic

**Files:**
- Create: `scripts/lib/chrome-mcp-client.js`
- Create: `scripts/lib/fetch-x-via-chrome-mcp.js`

- [ ] **Step 1: Add a failing transport smoke test in code shape**

```js
// The first runtime assertion for this task is inside fetch logic:
// if the MCP endpoint is unreachable, throw a descriptive error that mentions
// http://127.0.0.1:12306/mcp and the Chrome extension/native host.
```

- [ ] **Step 2: Implement a minimal MCP HTTP client wrapper**

```js
const DEFAULT_MCP_URL = process.env.CHROME_MCP_URL || "http://127.0.0.1:12306/mcp";

export class ChromeMcpClient {
  constructor({ url = DEFAULT_MCP_URL } = {}) {
    this.url = url;
    this.sessionId = null;
    this.requestId = 1;
  }

  async callTool(name, args = {}) {
    // initialize session if needed, then send tools/call-compatible request
  }
}
```

- [ ] **Step 3: Implement X fetch orchestration**

```js
export async function fetchXViaChromeMcp({ builders, date, dataDir }) {
  // For each builder:
  // 1. navigate to https://x.com/<handle>
  // 2. read the page content through MCP
  // 3. normalize tweets for the daily window
  // 4. save referenced images and archive files
  // 5. return downstream-compatible account records
}
```

- [ ] **Step 4: Make extraction defensive instead of brittle**

```js
// Normalize missing values to empty strings / empty arrays / zeroes.
// Skip reply tweets.
// Do not crash the whole run when one account fails.
```

- [ ] **Step 5: Run the fetch command and verify the failure mode is descriptive if MCP is unavailable**

Run: `npm --prefix scripts run fetch`
Expected: If the Chrome MCP server is not running, FAIL with a message that tells the user to start the Chrome MCP extension/native host instead of silently falling back to Apify.

### Task 4: Wire the new X fetch into the existing orchestration entry point

**Files:**
- Modify: `scripts/fetch-feeds.js`
- Test: `scripts/tests/x-html.test.js`
- Test: `scripts/tests/x-storage.test.js`
- Test: `scripts/tests/x-feed-export.test.js`

- [ ] **Step 1: Remove the Apify-based X fetch path**

```js
// Delete fetchTwitterViaApify() and its APIFY_TOKEN fallback behavior.
// Replace it with fetchXViaChromeMcp() imported from ./lib/fetch-x-via-chrome-mcp.js.
```

- [ ] **Step 2: Keep podcast and blog fetching unchanged**

```js
// Preserve the current RSS logic for podcasts and blogs.
```

- [ ] **Step 3: Export the compatible feed file**

```js
const feedX = buildFeedX({
  generatedAt: new Date().toISOString(),
  lookbackHours: 24,
  accounts: xResults,
});
```

- [ ] **Step 4: Run focused tests again**

Run: `node --test scripts/tests/x-html.test.js scripts/tests/x-storage.test.js scripts/tests/x-feed-export.test.js`
Expected: PASS

### Task 5: Verify end-to-end artifacts and downstream compatibility

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document the new X fetch prerequisite**

```md
- X/Twitter fetch now relies on a locally running Chrome MCP bridge backed by the user's logged-in Chrome session.
```

- [ ] **Step 2: Run the fetch pipeline**

Run: `npm run fetch`
Expected: `data/feed-x.json` plus `data/x-raw/<date>/`, `data/x-html/<date>/`, and `data/x-assets/<date>/` are created.

- [ ] **Step 3: Run downstream generation without refetch**

Run: `node scripts/generate-video.js --skip-fetch`
Expected: The existing digest/video pipeline accepts the new `data/feed-x.json` shape.

- [ ] **Step 4: Manually inspect one HTML archive**

Run: `sed -n '1,120p' data/x-html/<date>/karpathy.html`
Expected: The file contains tweet text and relative local asset references.

- [ ] **Step 5: Record any environment limitation**

```md
If the local Chrome MCP server is not started, record that end-to-end fetch verification is blocked by environment state rather than code shape.
```
