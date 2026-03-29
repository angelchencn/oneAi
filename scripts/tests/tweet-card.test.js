import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("TweetCard no longer contains QR-specific rendering", async () => {
  const source = await readFile("video/src/components/TweetCard.tsx", "utf8");

  assert.doesNotMatch(source, /QRCodeSVG/);
  assert.doesNotMatch(source, /扫码查看原文/);
  assert.doesNotMatch(source, /qrUrl/);
});

test("TweetCard no longer renders the mid-screen summary card", async () => {
  const source = await readFile("video/src/components/TweetCard.tsx", "utf8");

  assert.doesNotMatch(source, /Tweet text card/);
  assert.doesNotMatch(source, /\{subtitle \?\? ""\}/);
  assert.doesNotMatch(source, /backgroundColor: theme\.colors\.cardBg/);
});

test("TweetCard no longer renders author overlay on top of tweet screenshots", async () => {
  const source = await readFile("video/src/components/TweetCard.tsx", "utf8");

  assert.match(source, /=> null/);
  assert.doesNotMatch(source, /avatarUrl/);
  assert.doesNotMatch(source, /avatarFallback/);
  assert.doesNotMatch(source, /title\?: string/);
});
