import test from "node:test";
import assert from "node:assert/strict";

import { assignSegmentBackgrounds } from "../lib/background-assignment.js";

test("assignSegmentBackgrounds gives user images to intro, overview, and outro before tweets", () => {
  const segments = [
    { id: "intro", type: "intro", display: {} },
    { id: "overview", type: "overview", display: {} },
    {
      id: "tweet-a",
      type: "tweet",
      display: {},
      backgroundAsset: "backgrounds/tweet-a.jpg",
      backgroundSourcePath: "/tmp/tweet-a.jpg",
    },
    { id: "outro", type: "outro", display: {} },
  ];

  const updated = assignSegmentBackgrounds(segments, [
    "/tmp/cover-1.jpg",
    "/tmp/cover-2.jpg",
    "/tmp/cover-3.jpg",
  ]);

  assert.equal(updated[0].backgroundAsset, "backgrounds/cover-1.jpg");
  assert.equal(updated[1].backgroundAsset, "backgrounds/cover-2.jpg");
  assert.equal(updated[2].backgroundAsset, "backgrounds/tweet-a.jpg");
  assert.equal(updated[2].backdropAsset, "backgrounds/cover-1.jpg");
  assert.equal(updated[2].backgroundSourcePath, "/tmp/tweet-a.jpg");
  assert.equal(updated[3].backgroundAsset, "backgrounds/cover-3.jpg");
});

test("assignSegmentBackgrounds reuses available images in order for non-tweet segments", () => {
  const segments = [
    { id: "intro", type: "intro", display: {} },
    { id: "overview", type: "overview", display: {} },
    { id: "outro", type: "outro", display: {} },
  ];

  const updated = assignSegmentBackgrounds(segments, [
    "/tmp/cover-1.jpg",
    "/tmp/cover-2.jpg",
  ]);

  assert.equal(updated[0].backgroundAsset, "backgrounds/cover-1.jpg");
  assert.equal(updated[1].backgroundAsset, "backgrounds/cover-2.jpg");
  assert.equal(updated[2].backgroundAsset, "backgrounds/cover-1.jpg");
});

test("assignSegmentBackgrounds cycles user images as tweet backdrops without replacing screenshots", () => {
  const segments = [
    {
      id: "tweet-a",
      type: "tweet",
      display: {},
      backgroundAsset: "backgrounds/tweet-a.jpg",
      backgroundSourcePath: "/tmp/tweet-a.jpg",
    },
    {
      id: "tweet-b",
      type: "tweet",
      display: {},
      backgroundAsset: "backgrounds/tweet-b.jpg",
      backgroundSourcePath: "/tmp/tweet-b.jpg",
    },
    {
      id: "tweet-c",
      type: "tweet",
      display: {},
      backgroundAsset: "backgrounds/tweet-c.jpg",
      backgroundSourcePath: "/tmp/tweet-c.jpg",
    },
  ];

  const updated = assignSegmentBackgrounds(segments, [
    "/tmp/cover-1.jpg",
    "/tmp/cover-2.jpg",
  ]);

  assert.equal(updated[0].backgroundAsset, "backgrounds/tweet-a.jpg");
  assert.equal(updated[0].backdropAsset, "backgrounds/cover-1.jpg");
  assert.equal(updated[1].backgroundAsset, "backgrounds/tweet-b.jpg");
  assert.equal(updated[1].backdropAsset, "backgrounds/cover-2.jpg");
  assert.equal(updated[2].backgroundAsset, "backgrounds/tweet-c.jpg");
  assert.equal(updated[2].backdropAsset, "backgrounds/cover-1.jpg");
});
