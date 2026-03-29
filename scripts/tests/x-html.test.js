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
