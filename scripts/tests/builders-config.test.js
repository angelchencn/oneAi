import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { loadBuildersConfig } from "../lib/builders-config.js";

test("loadBuildersConfig reads builders.json from the repository root", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "builders-config-"));

  try {
    await writeFile(
      join(rootDir, "builders.json"),
      JSON.stringify([
        { name: "Test User", handle: "testuser" },
        { name: "Another User", handle: "another" },
      ], null, 2),
      "utf8",
    );

    const builders = await loadBuildersConfig({ rootDir });

    assert.deepEqual(builders, [
      { name: "Test User", handle: "testuser" },
      { name: "Another User", handle: "another" },
    ]);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("loadBuildersConfig rejects invalid builder records", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "builders-config-"));

  try {
    await writeFile(
      join(rootDir, "builders.json"),
      JSON.stringify([
        { name: "Valid User", handle: "valid" },
        { name: "Broken User" },
      ], null, 2),
      "utf8",
    );

    await assert.rejects(
      async () => loadBuildersConfig({ rootDir }),
      /builders\.json item 2 must include non-empty "name" and "handle" strings/i,
    );
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});
