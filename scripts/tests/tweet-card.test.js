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

test("TweetCard renders a larger author label outside the tweet screenshot", async () => {
  const [source, themeSource, compositionSource] = await Promise.all([
    readFile("video/src/components/TweetCard.tsx", "utf8"),
    readFile("video/src/styles/theme.ts", "utf8"),
    readFile("video/src/VideoComposition.tsx", "utf8"),
  ]);

  assert.doesNotMatch(source, /=> null/);
  assert.match(source, /interface TweetCardProps/);
  assert.match(source, /title\?: string/);
  assert.match(source, /theme\.fontSize\.tweetName/);
  assert.match(source, /backdropFilter:/);
  assert.match(source, /\{title\}/);
  assert.match(themeSource, /tweetName:/);
  assert.match(compositionSource, /<TweetCard\s+title=\{display\.title\}\s*\/>/);
  assert.doesNotMatch(source, /avatarUrl/);
  assert.doesNotMatch(source, /avatarFallback/);
});
