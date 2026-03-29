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
