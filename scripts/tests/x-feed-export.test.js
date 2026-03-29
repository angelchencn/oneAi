import test from "node:test";
import assert from "node:assert/strict";

import { buildFeedX } from "../lib/x-feed-export.js";
import { normalizeTweetUrl } from "../lib/fetch-x-via-chrome-mcp.js";

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
        tweets: [
          {
            id: "1",
            text: "Hello",
            createdAt: "2026-03-28T08:00:00.000Z",
            url: "https://x.com/karpathy/status/1",
            likes: 1,
            retweets: 0,
            replies: 0,
            images: [],
          },
        ],
      },
    ],
  });

  assert.equal(feed.x.length, 1);
  assert.equal(feed.stats.xBuilders, 1);
  assert.equal(feed.stats.totalTweets, 1);
});

test("normalizeTweetUrl rebuilds canonical x.com URL when bridge output is redacted", () => {
  const url = normalizeTweetUrl({
    handle: "zarazhangrui",
    tweetId: "2037661344154124309",
    rawUrl: "https://x.<redacted_base64>",
  });

  assert.equal(
    url,
    "https://x.com/zarazhangrui/status/2037661344154124309",
  );
});
