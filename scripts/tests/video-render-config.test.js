import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Root renders the video in an iPhone-style portrait aspect ratio", async () => {
  const source = await readFile("video/src/Root.tsx", "utf8");

  assert.match(source, /width=\{1170\}/);
  assert.match(source, /height=\{2532\}/);
});

test("theme video dimensions match the iPhone-style portrait composition", async () => {
  const source = await readFile("video/src/styles/theme.ts", "utf8");

  assert.match(source, /width:\s*1170/);
  assert.match(source, /height:\s*2532/);
});

test("Remotion keeps source frames in png for sharper output", async () => {
  const source = await readFile("video/remotion.config.ts", "utf8");

  assert.match(source, /Config\.setVideoImageFormat\("png"\)/);
});
