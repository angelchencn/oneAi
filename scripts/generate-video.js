#!/usr/bin/env node

// ============================================================================
// OneAI — Generate Daily Video
// ============================================================================
// One-click orchestration:
// fetch feeds → prepare digest → generate script → TTS → subtitles →
// copy assets → Remotion render MP4.
// ============================================================================

import { execFile, spawn } from "child_process";
import { promisify } from "util";
import { writeFile, readFile, mkdir, rm, copyFile } from "fs/promises";
import { existsSync } from "fs";
import { join, dirname, basename, extname, resolve } from "path";
import { fileURLToPath } from "url";
import { fetchFeeds } from "./fetch-feeds.js";
import {
  ensureAudioOutputPath,
  verifyAudioOutputFile,
} from "./lib/audio-output.js";
import {
  applyTweetScreenshotBackgrounds,
  captureSelectedTweetScreenshots,
} from "./lib/tweet-screenshots.js";
import { assignSegmentBackgrounds } from "./lib/background-assignment.js";
import { resolveBackgroundDir } from "./lib/background-assets.js";
import { loadBuildersConfig } from "./lib/builders-config.js";
import { ChromeMcpClient } from "./lib/chrome-mcp-client.js";
import { getChinaDateStamp } from "./lib/china-time.js";
import { hasReusablePrebuiltAudio } from "./lib/prebuilt-script.js";

const execFileAsync = promisify(execFile);

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUTPUT = join(ROOT, "output");
const AUDIO_DIR = join(OUTPUT, "audio");
const SCREENSHOT_DIR = join(ROOT, "data", "x-screenshots");
const VIDEO_DIR = join(ROOT, "release");
const VIDEO_PUBLIC_AUDIO = join(ROOT, "video", "public", "audio");
const VIDEO_PUBLIC_BACKGROUNDS = join(ROOT, "video", "public", "backgrounds");

const EDGE_TTS =
  "/Library/Frameworks/Python.framework/Versions/3.13/bin/edge-tts";

const FPS = 30;
const CHARS_PER_SECOND = 4;
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".webm", ".m4v"]);

function log(message) {
  console.log(`[generate-video] ${message}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs(argv) {
  const args = {
    scriptPath: null,
    backgroundDir: null,
    skipFetch: false,
    send: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const current = argv[i];

    if (current === "--script") {
      args.scriptPath = argv[i + 1] || null;
      i += 1;
      continue;
    }

    if (current === "--background-dir") {
      args.backgroundDir = argv[i + 1] || null;
      i += 1;
      continue;
    }

    if (current === "--skip-fetch") {
      args.skipFetch = true;
      continue;
    }

    if (current === "--send") {
      args.send = true;
    }
  }

  return args;
}

async function loadEnv() {
  const envPath = join(ROOT, ".env");
  if (!existsSync(envPath)) return;

  const content = await readFile(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function estimateDurationFromText(text) {
  const cnChars = String(text || "").replace(/[a-zA-Z\s\d]/g, "").length;
  const enWords = (String(text || "").match(/[a-zA-Z]+/g) || []).length;
  return cnChars / CHARS_PER_SECOND + enWords / 2.5;
}

async function getAudioDuration(filePath) {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v",
    "quiet",
    "-show_entries",
    "format=duration",
    "-of",
    "csv=p=0",
    filePath,
  ]);
  return parseFloat(stdout.trim());
}

function formatSrtTime(totalSeconds) {
  const safeMs = Math.max(0, Math.round(totalSeconds * 1000));
  const hours = Math.floor(safeMs / 3600000);
  const minutes = Math.floor((safeMs % 3600000) / 60000);
  const seconds = Math.floor((safeMs % 60000) / 1000);
  const milliseconds = safeMs % 1000;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")},${String(milliseconds).padStart(3, "0")}`;
}

async function writeSrtFile(segments, outputPath) {
  let cursor = 0;
  const blocks = segments.map((segment, index) => {
    const start = cursor;
    const end = cursor + segment.durationInSeconds;
    cursor = end;

    return [
      String(index + 1),
      `${formatSrtTime(start)} --> ${formatSrtTime(end)}`,
      segment.text,
      "",
    ].join("\n");
  });

  await writeFile(outputPath, `${blocks.join("\n").trim()}\n`, "utf-8");
}

async function listBackgroundAssets(backgroundDir) {
  if (!backgroundDir) return [];

  const absoluteDir = resolve(backgroundDir);
  if (!existsSync(absoluteDir)) {
    throw new Error(`Background directory does not exist: ${absoluteDir}`);
  }

  const { stdout } = await execFileAsync("find", [
    absoluteDir,
    "-maxdepth",
    "1",
    "-type",
    "f",
  ]);

  return stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((file) => {
      const extension = extname(file).toLowerCase();
      return IMAGE_EXTENSIONS.has(extension) || VIDEO_EXTENSIONS.has(extension);
    });
}

async function runFetchFeeds({ chromeMcpClient = null } = {}) {
  log("Step 1/6 — Fetching latest feeds...");
  await fetchFeeds({
    chromeMcpClient,
  });
}

async function runPrepareDigest() {
  log("Step 2/6 — Building digest...");
  const { stdout } = await execFileAsync("node", [join(__dirname, "prepare-digest.js")], {
    env: process.env,
  });
  const digest = JSON.parse(stdout);

  if (digest.status === "error") {
    throw new Error(`prepare-digest failed: ${digest.message}`);
  }

  return digest;
}

async function runGenerateScript(digest) {
  log("Step 3/6 — Generating Chinese script...");
  return new Promise((resolve, reject) => {
    const child = spawn("node", [join(__dirname, "generate-script.js")], {
      stdio: ["pipe", "pipe", "inherit"],
      env: process.env,
    });

    const chunks = [];
    child.stdout.on("data", (chunk) => chunks.push(chunk));

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`generate-script.js exited with code ${code}`));
        return;
      }

      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf-8")));
      } catch (error) {
        reject(new Error(`Failed to parse generate-script.js output: ${error.message}`));
      }
    });

    child.on("error", reject);
    child.stdin.write(JSON.stringify(digest, null, 2));
    child.stdin.end();
  });
}

async function runEdgeTTS(text, outputPath, attempt = 1) {
  const maxAttempts = 3;
  const ttsBin = existsSync(EDGE_TTS) ? EDGE_TTS : null;
  const args = [
    "--text",
    text,
    "--voice",
    "zh-CN-YunxiNeural",
    "--write-media",
    outputPath,
  ];

  try {
    await ensureAudioOutputPath(outputPath);
    if (ttsBin) {
      await execFileAsync(ttsBin, args, { env: process.env });
    } else {
      await execFileAsync("python3", ["-m", "edge_tts", ...args], { env: process.env });
    }
    verifyAudioOutputFile(outputPath);
    return true;
  } catch (error) {
    if (attempt < maxAttempts) {
      const backoffMs = Math.pow(2, attempt - 1) * 1000;
      log(`  TTS attempt ${attempt} failed (${error.message}). Retrying in ${backoffMs}ms...`);
      await sleep(backoffMs);
      return runEdgeTTS(text, outputPath, attempt + 1);
    }
    throw error;
  }
}

async function generateTTSForSegments(segments) {
  log(`Step 4/6 — Generating TTS audio for ${segments.length} segments...`);

  const enriched = [];

  for (const segment of segments) {
    const audioFileName = `${segment.id}.mp3`;
    const audioPath = join(AUDIO_DIR, audioFileName);

    let durationInSeconds;
    let audioFile;

    try {
      await runEdgeTTS(segment.text, audioPath);
      durationInSeconds = await getAudioDuration(audioPath);
      audioFile = `audio/${audioFileName}`;
      log(`  [OK] ${segment.id} — ${durationInSeconds.toFixed(2)}s`);
    } catch (error) {
      log(`  [WARN] TTS failed for "${segment.id}": ${error.message}`);
      durationInSeconds = estimateDurationFromText(segment.text);
      audioFile = "";
      log(`  [WARN] Using estimated duration: ${durationInSeconds.toFixed(2)}s`);
    }

    enriched.push({
      ...segment,
      audioFile,
      durationInSeconds,
      durationInFrames: Math.ceil(durationInSeconds * FPS),
    });
  }

  return enriched;
}

async function ensureCleanPublicDirs() {
  if (existsSync(VIDEO_PUBLIC_AUDIO)) {
    await rm(VIDEO_PUBLIC_AUDIO, { recursive: true, force: true });
  }
  if (existsSync(VIDEO_PUBLIC_BACKGROUNDS)) {
    await rm(VIDEO_PUBLIC_BACKGROUNDS, { recursive: true, force: true });
  }
}

async function copyAssetsToPublic(segments, backgroundAssets) {
  log("Step 5/6 — Copying assets to video/public/...");

  await mkdir(VIDEO_PUBLIC_AUDIO, { recursive: true });
  for (const segment of segments) {
    if (!segment.audioFile) continue;
    const fileName = basename(segment.audioFile);
    const src = join(AUDIO_DIR, fileName);
    const dest = join(VIDEO_PUBLIC_AUDIO, fileName);
    if (existsSync(src)) {
      await copyFile(src, dest);
      log(`  Copied audio/${fileName}`);
    }
  }

  if (backgroundAssets.length > 0) {
    await mkdir(VIDEO_PUBLIC_BACKGROUNDS, { recursive: true });
    for (const asset of backgroundAssets) {
      const fileName = basename(asset);
      await copyFile(asset, join(VIDEO_PUBLIC_BACKGROUNDS, fileName));
      log(`  Copied backgrounds/${fileName}`);
    }
  }

  const screenshotAssets = Array.from(
    new Set(
      segments
        .map((segment) => segment.backgroundSourcePath)
        .filter(Boolean),
    ),
  );

  if (screenshotAssets.length > 0) {
    await mkdir(VIDEO_PUBLIC_BACKGROUNDS, { recursive: true });
    for (const asset of screenshotAssets) {
      const fileName = basename(asset);
      await copyFile(asset, join(VIDEO_PUBLIC_BACKGROUNDS, fileName));
      log(`  Copied backgrounds/${fileName}`);
    }
  }
}

async function renderVideo(remotionPropsPath, outputFile) {
  log("Step 6/6 — Rendering video with Remotion...");

  await new Promise((resolve, reject) => {
    const child = spawn(
      "npx",
      [
        "remotion",
        "render",
        "src/index.ts",
        "VideoComposition",
        outputFile,
        "--props",
        remotionPropsPath,
      ],
      {
        cwd: join(ROOT, "video"),
        stdio: "inherit",
        env: process.env,
      },
    );

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Remotion render exited with code ${code}`));
        return;
      }
      resolve();
    });

    child.on("error", reject);
  });
}

async function sendToTelegram(videoPath, chatId, date) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn("TELEGRAM_BOT_TOKEN not set, skipping Telegram upload");
    return;
  }

  const videoData = await readFile(videoPath);
  const form = new FormData();
  form.append("chat_id", chatId);
  form.append("video", new Blob([videoData]), `ai-briefing-${date}.mp4`);
  form.append("caption", `AI 每日更新 · ${date}`);

  const response = await fetch(`https://api.telegram.org/bot${token}/sendVideo`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    console.warn(`Telegram upload failed: ${response.status} ${await response.text()}`);
    return;
  }

  console.log("Video sent to Telegram.");
}

async function run() {
  const startedAt = Date.now();
  const args = parseArgs(process.argv);
  let sharedChromeMcpClient = null;

  try {
    await loadEnv();
    const builderNames = (await loadBuildersConfig({ rootDir: ROOT })).map(({ name }) => name);
    sharedChromeMcpClient =
      !args.scriptPath && !args.skipFetch ? new ChromeMcpClient() : null;
    const backgroundDir = resolveBackgroundDir({
      rootDir: ROOT,
      cliBackgroundDir: args.backgroundDir,
    });
    await mkdir(AUDIO_DIR, { recursive: true });
    await mkdir(VIDEO_DIR, { recursive: true });
    await ensureCleanPublicDirs();

    const backgroundAssets = await listBackgroundAssets(backgroundDir);

    let videoScript;
    let stats;

    if (args.scriptPath) {
      log("Loading prebuilt script...");
      videoScript = JSON.parse(await readFile(args.scriptPath, "utf-8"));
      stats = {
        xBuilders: videoScript.segments.filter((segment) => segment.type === "tweet").length,
        podcastEpisodes: videoScript.segments.filter((segment) => segment.type === "podcast").length,
        blogPosts: videoScript.segments.filter((segment) => segment.type === "blog").length,
      };
    } else {
      if (!args.skipFetch) {
        await runFetchFeeds({
          chromeMcpClient: sharedChromeMcpClient,
        });
      } else {
        log("Step 1/6 — Skipping feed fetch, using local data.");
      }

      const digest = await runPrepareDigest();
      stats = digest.stats;

      const hasContent =
        (stats?.xBuilders || 0) > 0 ||
        (stats?.podcastEpisodes || 0) > 0 ||
        (stats?.blogPosts || 0) > 0;

      if (!hasContent) {
        log("No content found in digest. Exiting early.");
        process.exit(0);
      }

      log(
        `Digest loaded: ${stats.xBuilders} builders, ${stats.podcastEpisodes} podcasts, ${stats.blogPosts} blogs`,
      );
      videoScript = await runGenerateScript(digest);
      log(
        `Script generated: ${videoScript.segmentCount} segments, ~${videoScript.estimatedDurationSeconds}s`,
      );
    }

    log("Step 4/6 — Capturing tweet screenshots for selected segments...");
    const resolvedDate = videoScript.date || getChinaDateStamp();
    const screenshotMap = await captureSelectedTweetScreenshots({
      segments: videoScript.segments,
      date: resolvedDate,
      screenshotsRootDir: SCREENSHOT_DIR,
      minScreenshotWidth: args.scriptPath ? 0 : undefined,
      createClient: sharedChromeMcpClient
        ? () => sharedChromeMcpClient
        : undefined,
    });

    const withTweetScreenshots = applyTweetScreenshotBackgrounds(
      videoScript.segments,
      screenshotMap,
    );
    const withBackgrounds = assignSegmentBackgrounds(withTweetScreenshots, backgroundAssets);
    const canReusePrebuiltAudio = args.scriptPath && hasReusablePrebuiltAudio(
      withBackgrounds,
      (audioFile) => existsSync(join(OUTPUT, audioFile)),
    );
    const enrichedSegments = canReusePrebuiltAudio
      ? withBackgrounds
      : await generateTTSForSegments(withBackgrounds);

    if (canReusePrebuiltAudio) {
      log(`Step 4/6 — Reusing prebuilt audio and timing for ${withBackgrounds.length} segments...`);
    }

    const scriptWithAudioPath = join(OUTPUT, "script-with-audio.json");
    await writeFile(
      scriptWithAudioPath,
      JSON.stringify({ ...videoScript, segments: enrichedSegments }, null, 2),
      "utf-8",
    );
    log(`Wrote enriched script to ${scriptWithAudioPath}`);

    const date = resolvedDate;
    const srtPath = join(VIDEO_DIR, `digest-${date}.srt`);
    await writeSrtFile(enrichedSegments, srtPath);
    log(`Wrote subtitles to ${srtPath}`);

    await copyAssetsToPublic(enrichedSegments, backgroundAssets);

    const remotionProps = {
      segments: enrichedSegments,
      date,
      stats: {
        builders: builderNames.length,
        podcasts: stats.podcastEpisodes || 0,
        blogs: stats.blogPosts || 0,
      },
      builderNames,
    };

    const remotionPropsPath = join(OUTPUT, "remotion-props.json");
    await writeFile(remotionPropsPath, JSON.stringify(remotionProps, null, 2), "utf-8");
    log(`Wrote Remotion props to ${remotionPropsPath}`);

    const outputFile = join(VIDEO_DIR, `digest-${date}.mp4`);
    await renderVideo(remotionPropsPath, outputFile);

    const totalAudioSegments = enrichedSegments.filter((segment) => segment.audioFile).length;
    const totalEstimatedSegments = enrichedSegments.length - totalAudioSegments;
    const totalDurationSeconds = enrichedSegments.reduce(
      (sum, segment) => sum + segment.durationInSeconds,
      0,
    );
    const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);

    console.log("\n========================================");
    console.log(" Daily Video Complete");
    console.log("========================================");
    console.log(`  Video:          ${outputFile}`);
    console.log(`  Subtitles:      ${srtPath}`);
    console.log(`  Segments:       ${enrichedSegments.length}`);
    console.log(`  TTS audio:      ${totalAudioSegments} ok, ${totalEstimatedSegments} estimated`);
    console.log(`  Backgrounds:    ${backgroundAssets.length}`);
    console.log(`  Duration:       ${totalDurationSeconds.toFixed(1)}s`);
    console.log(`  Elapsed time:   ${elapsedSeconds}s`);
    console.log("========================================\n");

    if (args.send) {
      await sendToTelegram(outputFile, "8361396438", date);
    }
  } finally {
    await sharedChromeMcpClient?.close?.();
  }
}

run().catch(async (error) => {
  console.error(`\nERROR: ${error.message}`);
  try {
    if (existsSync(AUDIO_DIR)) {
      await rm(AUDIO_DIR, { recursive: true, force: true });
      console.log("Cleaned up partial audio files.");
    }
  } catch {}
  process.exit(1);
});
