import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

import {
  ensureAudioOutputPath,
  verifyAudioOutputFile,
} from "../lib/audio-output.js";

test("ensureAudioOutputPath creates the parent directory for a target mp3", async () => {
  const root = await mkdtemp(join(tmpdir(), "oneai-audio-"));
  const target = join(root, "audio", "segment.mp3");

  try {
    await ensureAudioOutputPath(target);
    assert.equal(existsSync(join(root, "audio")), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("verifyAudioOutputFile throws when edge tts exits without writing a file", () => {
  assert.throws(
    () => verifyAudioOutputFile("/tmp/oneai-missing.mp3"),
    /did not create expected audio file/,
  );
});

test("verifyAudioOutputFile throws when edge tts leaves an empty mp3", async () => {
  const root = await mkdtemp(join(tmpdir(), "oneai-audio-"));
  const target = join(root, "audio", "segment.mp3");

  try {
    await ensureAudioOutputPath(target);
    await writeFile(target, "");

    assert.throws(
      () => verifyAudioOutputFile(target),
      /empty audio file/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
