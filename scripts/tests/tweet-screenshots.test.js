import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

import {
  applyTweetScreenshotBackgrounds,
  captureSelectedTweetScreenshots,
} from "../lib/tweet-screenshots.js";

test("applyTweetScreenshotBackgrounds only decorates selected tweet segments", () => {
  const segments = [
    {
      id: "intro",
      type: "intro",
      text: "intro",
      display: {},
    },
    {
      id: "tweet-sama",
      type: "tweet",
      text: "中文摘要",
      display: { qrUrl: "https://x.com/sama/status/1" },
    },
  ];

  const updated = applyTweetScreenshotBackgrounds(segments, {
    "tweet-sama": {
      backgroundAsset: "backgrounds/tweet-sama.png",
      backgroundSourcePath: "/tmp/tweet-sama.png",
    },
  });

  assert.equal(updated[0].backgroundAsset, undefined);
  assert.equal(updated[1].backgroundAsset, "backgrounds/tweet-sama.png");
  assert.equal(updated[1].backgroundSourcePath, "/tmp/tweet-sama.png");
});

test("captureSelectedTweetScreenshots reuses one work tab for all selected tweets and closes it", async () => {
  const tmpRoot = await mkdtemp(join(tmpdir(), "tweet-screenshots-"));
  const calls = [];
  let getWindowsCalls = 0;
  let closed = 0;

  const fakeClient = {
    async assertAvailable() {
      calls.push({ tool: "assertAvailable" });
    },
    async close() {
      closed += 1;
    },
    async callJsonTool(tool, args = {}) {
      calls.push({ tool, args });

      if (tool === "get_windows_and_tabs") {
        getWindowsCalls += 1;
        if (getWindowsCalls === 1) {
          return {
            windows: [
              {
                windowId: 11,
                tabs: [
                  { tabId: 101, active: true, url: "https://x.com/home" },
                ],
              },
            ],
          };
        }

        return {
          windows: [
            {
              windowId: 11,
              tabs: [
                { tabId: 101, active: true, url: "https://x.com/home" },
                { tabId: 202, active: false, url: "chrome://newtab/" },
              ],
            },
          ],
        };
      }

      if (tool === "chrome_javascript") {
        return { success: true };
      }

      if (tool === "chrome_navigate" && args.tabId == null) {
        return { success: true, tabId: 202, windowId: 11 };
      }

      if (tool === "chrome_screenshot") {
        return {
          base64Data: Buffer.from("png-bytes").toString("base64"),
          mimeType: "image/png",
        };
      }

      return { success: true };
    },
  };

  try {
    const screenshots = await captureSelectedTweetScreenshots({
      segments: [
        {
          id: "tweet-a",
          type: "tweet",
          display: { qrUrl: "https://x.com/a/status/1" },
        },
        {
          id: "tweet-b",
          type: "tweet",
          display: { qrUrl: "https://x.com/b/status/2" },
        },
      ],
      date: "2026-03-28",
      screenshotsRootDir: tmpRoot,
      createClient: () => fakeClient,
    });

    assert.deepEqual(Object.keys(screenshots).sort(), ["tweet-a", "tweet-b"]);
    assert.match(screenshots["tweet-a"].backgroundSourcePath, /tweet-a\.png$/);
    assert.match(screenshots["tweet-b"].backgroundSourcePath, /tweet-b\.png$/);

    const navigateCalls = calls.filter(
      (call) => call.tool === "chrome_navigate" && call.args.tabId != null,
    );
    assert.equal(navigateCalls.length, 2);
    assert.deepEqual(
      navigateCalls.map((call) => call.args.tabId),
      [202, 202],
    );

    const openTabCalls = calls.filter(
      (call) => call.tool === "chrome_navigate" && call.args.tabId == null,
    );
    assert.equal(openTabCalls.length, 1);
    assert.equal(openTabCalls[0].args.windowId, 11);

    const screenshotCalls = calls.filter((call) => call.tool === "chrome_screenshot");
    assert.equal(screenshotCalls.length, 2);
    assert.equal(screenshotCalls[0].args.savePng, true);
    assert.equal(screenshotCalls[0].args.width, 1800);
    assert.equal(screenshotCalls[0].args.height, 2500);

    const closeCalls = calls.filter((call) => call.tool === "chrome_close_tabs");
    assert.equal(closeCalls.length, 1);
    assert.deepEqual(closeCalls[0].args.tabIds, [202]);
    assert.equal(closed, 1);
  } finally {
    await rm(tmpRoot, { recursive: true, force: true });
  }
});

test("captureSelectedTweetScreenshots closes the work tab and client when one screenshot fails", async () => {
  const tmpRoot = await mkdtemp(join(tmpdir(), "tweet-screenshots-"));
  const calls = [];
  let getWindowsCalls = 0;
  let closed = 0;

  const fakeClient = {
    async assertAvailable() {
      calls.push({ tool: "assertAvailable" });
    },
    async close() {
      closed += 1;
    },
    async callJsonTool(tool, args = {}) {
      calls.push({ tool, args });

      if (tool === "get_windows_and_tabs") {
        getWindowsCalls += 1;
        if (getWindowsCalls === 1) {
          return {
            windows: [
              {
                windowId: 11,
                tabs: [
                  { tabId: 101, active: true, url: "https://x.com/home" },
                ],
              },
            ],
          };
        }

        return {
          windows: [
            {
              windowId: 11,
              tabs: [
                { tabId: 101, active: true, url: "https://x.com/home" },
                { tabId: 202, active: false, url: "chrome://newtab/" },
              ],
            },
          ],
        };
      }

      if (tool === "chrome_javascript") {
        if (args.tabId === 202 && String(args.code || "").includes("tweet card")) {
          return { success: false, message: "tweet card not found" };
        }
        return { success: true };
      }

      if (tool === "chrome_navigate" && args.tabId == null) {
        return { success: true, tabId: 202, windowId: 11 };
      }

      if (tool === "chrome_screenshot") {
        return {
          base64Data: Buffer.from("png-bytes").toString("base64"),
          mimeType: "image/png",
        };
      }

      return { success: true };
    },
  };

  try {
    const screenshots = await captureSelectedTweetScreenshots({
      segments: [
        {
          id: "tweet-a",
          type: "tweet",
          display: { qrUrl: "https://x.com/a/status/1" },
        },
      ],
      date: "2026-03-28",
      screenshotsRootDir: tmpRoot,
      createClient: () => fakeClient,
    });

    assert.deepEqual(screenshots, {});

    const closeCalls = calls.filter((call) => call.tool === "chrome_close_tabs");
    assert.equal(closeCalls.length, 1);
    assert.deepEqual(closeCalls[0].args.tabIds, [202]);
    assert.equal(closed, 1);
  } finally {
    await rm(tmpRoot, { recursive: true, force: true });
  }
});

test("captureSelectedTweetScreenshots reuses existing local screenshots before requiring MCP", async () => {
  const tmpRoot = await mkdtemp(join(tmpdir(), "tweet-screenshots-"));
  const dateDir = join(tmpRoot, "2026-03-28");

  try {
    await mkdir(dateDir, { recursive: true });
    await Promise.all([
      writeFile(join(dateDir, "tweet-a.jpg"), "existing-image"),
      writeFile(join(dateDir, "tweet-b.png"), "existing-image"),
    ]);

    const screenshots = await captureSelectedTweetScreenshots({
      segments: [
        {
          id: "tweet-a",
          type: "tweet",
          display: { qrUrl: "https://x.com/a/status/1" },
        },
        {
          id: "tweet-b",
          type: "tweet",
          display: { qrUrl: "https://x.com/b/status/2" },
        },
      ],
      date: "2026-03-28",
      screenshotsRootDir: tmpRoot,
      getImageDimensions: async () => ({ width: 1400, height: 1944 }),
      createClient: () => {
        throw new Error("MCP should not be used when screenshots already exist");
      },
    });

    assert.deepEqual(screenshots, {
      "tweet-a": {
        backgroundAsset: "backgrounds/tweet-a.jpg",
        backgroundSourcePath: join(dateDir, "tweet-a.jpg"),
      },
      "tweet-b": {
        backgroundAsset: "backgrounds/tweet-b.png",
        backgroundSourcePath: join(dateDir, "tweet-b.png"),
      },
    });
  } finally {
    await rm(tmpRoot, { recursive: true, force: true });
  }
});

test("captureSelectedTweetScreenshots can reuse low-resolution screenshots when offline rebuild mode disables the width gate", async () => {
  const tmpRoot = await mkdtemp(join(tmpdir(), "tweet-screenshots-"));
  const dateDir = join(tmpRoot, "2026-03-28");

  try {
    await mkdir(dateDir, { recursive: true });
    await writeFile(join(dateDir, "tweet-a.jpg"), "existing-image");

    const screenshots = await captureSelectedTweetScreenshots({
      segments: [
        {
          id: "tweet-a",
          type: "tweet",
          display: { qrUrl: "https://x.com/a/status/1" },
        },
      ],
      date: "2026-03-28",
      screenshotsRootDir: tmpRoot,
      getImageDimensions: async () => ({ width: 756, height: 1050 }),
      minScreenshotWidth: 0,
      createClient: () => {
        throw new Error("MCP should not be used when offline rebuilds reuse local screenshots");
      },
    });

    assert.deepEqual(screenshots, {
      "tweet-a": {
        backgroundAsset: "backgrounds/tweet-a.jpg",
        backgroundSourcePath: join(dateDir, "tweet-a.jpg"),
      },
    });
  } finally {
    await rm(tmpRoot, { recursive: true, force: true });
  }
});

test("captureSelectedTweetScreenshots recaptures existing screenshots when they are too low resolution", async () => {
  const tmpRoot = await mkdtemp(join(tmpdir(), "tweet-screenshots-"));
  const dateDir = join(tmpRoot, "2026-03-28");
  const calls = [];
  let getWindowsCalls = 0;

  const fakeClient = {
    async assertAvailable() {},
    async close() {},
    async callJsonTool(tool, args = {}) {
      calls.push({ tool, args });

      if (tool === "get_windows_and_tabs") {
        getWindowsCalls += 1;
        if (getWindowsCalls === 1) {
          return {
            windows: [
              {
                windowId: 11,
                tabs: [
                  { tabId: 101, active: true, url: "https://x.com/home" },
                ],
              },
            ],
          };
        }

        return {
          windows: [
            {
              windowId: 11,
              tabs: [
                { tabId: 101, active: true, url: "https://x.com/home" },
                { tabId: 202, active: false, url: "chrome://newtab/" },
              ],
            },
          ],
        };
      }

      if (tool === "chrome_javascript") {
        return { success: true };
      }

      if (tool === "chrome_navigate" && args.tabId == null) {
        return { success: true, tabId: 202, windowId: 11 };
      }

      if (tool === "chrome_screenshot") {
        return {
          base64Data: Buffer.from("png-bytes").toString("base64"),
          mimeType: "image/png",
        };
      }

      return { success: true };
    },
  };

  try {
    await mkdir(dateDir, { recursive: true });
    await writeFile(join(dateDir, "tweet-a.jpg"), "existing-image");

    const screenshots = await captureSelectedTweetScreenshots({
      segments: [
        {
          id: "tweet-a",
          type: "tweet",
          display: { qrUrl: "https://x.com/a/status/1" },
        },
      ],
      date: "2026-03-28",
      screenshotsRootDir: tmpRoot,
      getImageDimensions: async () => ({ width: 756, height: 1050 }),
      createClient: () => fakeClient,
    });

    assert.deepEqual(Object.keys(screenshots), ["tweet-a"]);
    assert.match(screenshots["tweet-a"].backgroundSourcePath, /tweet-a\.png$/);
    assert.ok(calls.some((call) => call.tool === "chrome_screenshot"));
  } finally {
    await rm(tmpRoot, { recursive: true, force: true });
  }
});
