import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";

function runFetchFeedsWithFrozenClock() {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "node",
      [
        "--import",
        "./scripts/tests/helpers/freeze-date.mjs",
        "--input-type=module",
        "-e",
        `
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fetchFeeds } from "./scripts/fetch-feeds.js";

const dataDir = await mkdtemp(join(tmpdir(), "oneai-fetch-date-"));
const fakeClient = {
  async assertAvailable() {},
  async callJsonTool(tool) {
    if (tool === "chrome_javascript") {
      return {
        success: true,
        result: {
          bio: "",
          avatarUrl: "",
          tweets: [],
        },
      };
    }

    return { success: true };
  },
  async close() {},
};

const result = await fetchFeeds({
  dataDir,
  builders: [],
  podcasts: [],
  blogs: [],
  chromeMcpClient: fakeClient,
});

console.log("RESULT=" + JSON.stringify({ date: result.date }));
await rm(dataDir, { recursive: true, force: true });
`,
      ],
      {
        cwd: process.cwd(),
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          TZ: "America/Los_Angeles",
          ONEAI_TEST_NOW: "2026-03-28T18:30:00.000Z",
        },
      },
    );

    const stdout = [];
    const stderr = [];

    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(Buffer.concat(stderr).toString("utf8")));
        return;
      }

      const output = Buffer.concat(stdout).toString("utf8");
      const resultLine = output
        .split("\n")
        .map((line) => line.trim())
        .find((line) => line.startsWith("RESULT="));

      if (!resultLine) {
        reject(new Error(`Missing RESULT line in fetch-feeds output:\n${output}`));
        return;
      }

      resolve(JSON.parse(resultLine.slice("RESULT=".length)));
    });
  });
}

test("fetch-feeds defaults its archive date to GMT+8", async () => {
  const result = await runFetchFeedsWithFrozenClock();
  assert.equal(result.date, "2026-03-29");
});
