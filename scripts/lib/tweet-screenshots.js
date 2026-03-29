import { execFile } from "child_process";
import { writeFile, mkdir, access } from "fs/promises";
import { basename, join } from "path";
import { promisify } from "util";
import { ChromeMcpClient } from "./chrome-mcp-client.js";

const execFileAsync = promisify(execFile);
const MIN_TWEET_SCREENSHOT_WIDTH = 1100;
const TWEET_CAPTURE_WIDTH = 1800;
const TWEET_CAPTURE_HEIGHT = 2500;

function inferExtensionFromMime(mimeType) {
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  return ".jpg";
}

function normalizeBase64Payload(base64Data) {
  return String(base64Data || "").replace(/\s+/g, "");
}

function log(message) {
  console.log(`[tweet-screenshots] ${message}`);
}

async function getImageDimensions(filePath) {
  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height",
      "-of",
      "csv=p=0:s=x",
      filePath,
    ]);

    const [width, height] = stdout
      .trim()
      .split("x")
      .map((value) => Number.parseInt(value, 10));

    if (!Number.isFinite(width) || !Number.isFinite(height)) {
      return null;
    }

    return { width, height };
  } catch {
    return null;
  }
}

function extractResultPayload(payload) {
  if (typeof payload === "string") {
    try {
      return extractResultPayload(JSON.parse(payload));
    } catch {
      return payload;
    }
  }

  if (!payload || typeof payload !== "object") return payload;
  if ("result" in payload) return extractResultPayload(payload.result);
  return payload;
}

function normalizeWindowsPayload(payload) {
  const resolved = extractResultPayload(payload);
  if (Array.isArray(resolved)) return resolved;
  if (Array.isArray(resolved?.windows)) return resolved.windows;
  return [];
}

function findActiveTabContext(windows) {
  for (const window of windows) {
    for (const tab of window?.tabs || []) {
      if (tab?.active) {
        return {
          windowId: Number(window.windowId ?? window.id),
          tabId: Number(tab.tabId ?? tab.id),
        };
      }
    }
  }

  return null;
}

function findNewTabContext(beforeWindows, afterWindows, preferredWindowId) {
  const beforeIds = new Set();
  for (const window of beforeWindows) {
    for (const tab of window?.tabs || []) {
      beforeIds.add(Number(tab.tabId ?? tab.id));
    }
  }

  const candidates = [];
  for (const window of afterWindows) {
    for (const tab of window?.tabs || []) {
      const tabId = Number(tab.tabId ?? tab.id);
      if (!beforeIds.has(tabId)) {
        candidates.push({
          windowId: Number(window.windowId ?? window.id),
          tabId,
        });
      }
    }
  }

  return (
    candidates.find((tab) => tab.windowId === preferredWindowId) ||
    candidates[0] ||
    null
  );
}

async function listWindowsAndTabs(client) {
  const payload = await client.callJsonTool("get_windows_and_tabs", {});
  return normalizeWindowsPayload(payload);
}

async function openWorkTab(client) {
  const beforeWindows = await listWindowsAndTabs(client);
  const sourceContext = findActiveTabContext(beforeWindows);
  if (!sourceContext) {
    throw new Error("No active Chrome tab found for tweet screenshot capture");
  }

  const navigationResult = extractResultPayload(
    await client.callJsonTool("chrome_navigate", {
      url: "https://x.com",
      windowId: sourceContext.windowId,
      background: true,
    }),
  );

  if (navigationResult?.tabId) {
    return {
      windowId: Number(
        navigationResult.windowId ?? sourceContext.windowId,
      ),
      tabId: Number(navigationResult.tabId),
    };
  }

  const afterWindows = await listWindowsAndTabs(client);
  const workContext = findNewTabContext(
    beforeWindows,
    afterWindows,
    sourceContext.windowId,
  );

  if (!workContext) {
    throw new Error("Could not resolve newly opened screenshot work tab");
  }

  return workContext;
}

async function waitForTweetCard(client, tabId) {
  return extractResultPayload(await client.callJsonTool("chrome_javascript", {
    tabId,
    code: `
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
for (let attempt = 0; attempt < 20; attempt += 1) {
  const article = document.querySelector('article[data-testid="tweet"]');
  if (article) {
    article.scrollIntoView({ block: "center" });
    return { success: true };
  }
  await wait(500);
}
return { success: false, message: "tweet card not found" };
`,
    timeoutMs: 15000,
    maxOutputBytes: 20000,
  }));
}

async function captureTweetScreenshot(client, { segmentId, qrUrl, outputDir, tabId }) {
  await client.callJsonTool("chrome_navigate", {
    url: qrUrl,
    tabId,
    background: false,
  });

  const waitResult = await waitForTweetCard(client, tabId);
  if (!waitResult.success) {
    throw new Error(waitResult.message || "tweet card not ready for screenshot");
  }

  const screenshot = extractResultPayload(
    await client.callJsonTool("chrome_screenshot", {
      name: segmentId,
      selector: 'article[data-testid="tweet"]',
      tabId,
      storeBase64: true,
      savePng: true,
      fullPage: false,
      width: TWEET_CAPTURE_WIDTH,
      height: TWEET_CAPTURE_HEIGHT,
    }),
  );

  const base64Data = normalizeBase64Payload(
    screenshot.base64Data || screenshot.data || screenshot.imageBase64,
  );
  if (!base64Data) {
    throw new Error(`Screenshot did not include base64 data for ${segmentId}`);
  }

  const extension = inferExtensionFromMime(screenshot.mimeType || screenshot.type);
  const targetPath = join(outputDir, `${segmentId}${extension}`);
  await mkdir(outputDir, { recursive: true });
  await writeFile(targetPath, Buffer.from(base64Data, "base64"));

  return targetPath;
}

export function applyTweetScreenshotBackgrounds(segments, screenshotsById) {
  return segments.map((segment) => {
    if (segment.type !== "tweet") return segment;
    const screenshot = screenshotsById[segment.id];
    if (!screenshot) return segment;

    return {
      ...segment,
      backgroundAsset: screenshot.backgroundAsset,
      backgroundSourcePath: screenshot.backgroundSourcePath,
    };
  });
}

async function findExistingScreenshot(
  outputDir,
  segmentId,
  resolveImageDimensions,
  minScreenshotWidth,
) {
  const candidates = [".jpg", ".jpeg", ".png", ".webp"].map((extension) =>
    join(outputDir, `${segmentId}${extension}`),
  );

  for (const candidate of candidates) {
    try {
      await access(candidate);
      const dimensions = await resolveImageDimensions(candidate);
      if (dimensions && dimensions.width < minScreenshotWidth) {
        continue;
      }
      return candidate;
    } catch {}
  }

  return null;
}

export async function captureSelectedTweetScreenshots({
  segments,
  date,
  screenshotsRootDir,
  minScreenshotWidth = MIN_TWEET_SCREENSHOT_WIDTH,
  getImageDimensions: resolveImageDimensions = getImageDimensions,
  createClient = () => new ChromeMcpClient(),
}) {
  const tweetSegments = segments.filter(
    (segment) => segment.type === "tweet" && segment.display?.qrUrl,
  );

  if (tweetSegments.length === 0) return {};

  const outputDir = join(screenshotsRootDir, date);
  const screenshotsById = {};
  const missingSegments = [];

  for (const segment of tweetSegments) {
    const existingPath = await findExistingScreenshot(
      outputDir,
      segment.id,
      resolveImageDimensions,
      minScreenshotWidth,
    );
    if (existingPath) {
      screenshotsById[segment.id] = {
        backgroundAsset: `backgrounds/${basename(existingPath)}`,
        backgroundSourcePath: existingPath,
      };
      continue;
    }

    missingSegments.push(segment);
  }

  if (missingSegments.length === 0) {
    return screenshotsById;
  }

  const client = createClient();
  let workTab = null;

  try {
    await client.assertAvailable();
    workTab = await openWorkTab(client);

    for (const segment of missingSegments) {
      try {
        const localPath = await captureTweetScreenshot(client, {
          segmentId: segment.id,
          qrUrl: segment.display.qrUrl,
          outputDir,
          tabId: workTab.tabId,
        });

        screenshotsById[segment.id] = {
          backgroundAsset: `backgrounds/${basename(localPath)}`,
          backgroundSourcePath: localPath,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log(`Skipping ${segment.id}: ${message}`);
      }
    }

    return screenshotsById;
  } finally {
    if (workTab?.tabId) {
      try {
        await client.callJsonTool("chrome_close_tabs", {
          tabIds: [workTab.tabId],
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log(`Failed to close screenshot work tab ${workTab.tabId}: ${message}`);
      }
    }

    await client.close?.();
  }
}
