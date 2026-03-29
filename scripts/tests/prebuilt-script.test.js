import test from "node:test";
import assert from "node:assert/strict";

import { hasReusablePrebuiltAudio } from "../lib/prebuilt-script.js";

test("hasReusablePrebuiltAudio only returns true when every segment includes timing and a local audio file", () => {
  assert.equal(
    hasReusablePrebuiltAudio([
      {
        id: "intro",
        audioFile: "audio/intro.mp3",
        durationInSeconds: 4.2,
        durationInFrames: 126,
      },
      {
        id: "tweet-a",
        audioFile: "audio/tweet-a.mp3",
        durationInSeconds: 8.5,
        durationInFrames: 255,
      },
    ], (audioFile) => audioFile === "audio/intro.mp3" || audioFile === "audio/tweet-a.mp3"),
    true,
  );

  assert.equal(
    hasReusablePrebuiltAudio([
      {
        id: "intro",
        audioFile: "audio/intro.mp3",
        durationInSeconds: 4.2,
        durationInFrames: 126,
      },
      {
        id: "tweet-a",
        audioFile: "",
        durationInSeconds: 8.5,
        durationInFrames: 255,
      },
    ], () => true),
    false,
  );

  assert.equal(
    hasReusablePrebuiltAudio([
      {
        id: "intro",
        audioFile: "audio/intro.mp3",
        durationInSeconds: 4.2,
        durationInFrames: 126,
      },
      {
        id: "tweet-a",
        audioFile: "audio/tweet-a.mp3",
        durationInSeconds: 8.5,
        durationInFrames: 255,
      },
    ], (audioFile) => audioFile === "audio/intro.mp3"),
    false,
  );
});
