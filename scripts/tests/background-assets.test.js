import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { resolveBackgroundDir } from "../lib/background-assets.js";

test("resolveBackgroundDir prefers an explicit CLI background dir", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "background-assets-"));

  try {
    await mkdir(join(rootDir, "background"), { recursive: true });

    const resolved = resolveBackgroundDir({
      rootDir,
      cliBackgroundDir: "./background",
      envBackgroundDir: "/env/backgrounds",
    });

    assert.equal(resolved, join(rootDir, "background"));
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("resolveBackgroundDir uses BACKGROUND_DIR when set", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "background-assets-"));

  try {
    await mkdir(join(rootDir, "custom-backgrounds"), { recursive: true });

    const resolved = resolveBackgroundDir({
      rootDir,
      envBackgroundDir: "./custom-backgrounds",
    });

    assert.equal(resolved, join(rootDir, "custom-backgrounds"));
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("resolveBackgroundDir falls back to the repository background directory", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "background-assets-"));

  try {
    await mkdir(join(rootDir, "background"), { recursive: true });

    const resolved = resolveBackgroundDir({ rootDir });

    assert.equal(resolved, join(rootDir, "background"));
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("resolveBackgroundDir returns null when no background directory exists", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "background-assets-"));

  try {
    const resolved = resolveBackgroundDir({ rootDir });

    assert.equal(resolved, null);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});
