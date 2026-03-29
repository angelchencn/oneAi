import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Subtitle anchors captions near the bottom safe area", async () => {
  const source = await readFile("video/src/components/Subtitle.tsx", "utf8");

  assert.match(source, /bottom:\s*92/);
  assert.match(source, /fontSize:\s*44/);
  assert.match(source, /padding:\s*"20px 40px"/);
});
