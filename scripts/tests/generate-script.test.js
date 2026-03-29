import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";

function runGenerateScript(input, { env = {}, nodeArgs = [] } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [...nodeArgs, "scripts/generate-script.js"], {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        ...env,
      },
    });

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

      resolve(JSON.parse(Buffer.concat(stdout).toString("utf8")));
    });

    child.stdin.write(JSON.stringify(input));
    child.stdin.end();
  });
}

test("generate-script keeps the script Twitter-only even when digest includes podcasts and blogs", async () => {
  const digest = {
    x: [
      {
        name: "Sam Altman",
        handle: "sama",
        bio: "OpenAI",
        avatarUrl: "",
        tweets: [
          {
            id: "1",
            text: "Announcing a major model update with much better coding and reasoning.",
            createdAt: new Date().toISOString(),
            url: "https://x.com/sama/status/1",
            likes: 1000,
            retweets: 200,
            replies: 80,
          },
        ],
      },
    ],
    podcasts: [
      {
        name: "AI Podcast",
        title: "Episode 1",
        description: "A long podcast summary",
        publishedAt: new Date().toISOString(),
        url: "https://example.com/podcast",
      },
    ],
    blogs: [
      {
        name: "AI Blog",
        title: "Post 1",
        summary: "A long blog summary",
        publishedAt: new Date().toISOString(),
        url: "https://example.com/blog",
      },
    ],
  };

  const script = await runGenerateScript(digest);
  const types = script.segments.map((segment) => segment.type);

  assert.deepEqual(types, ["intro", "overview", "tweet", "outro"]);
  assert.equal(script.stats.builders, 1);
  assert.equal(script.stats.podcasts, 0);
  assert.equal(script.stats.blogs, 0);
  assert.match(script.segments[0].text, /位 AI 从业者动态/);
  assert.doesNotMatch(script.segments[0].text, /播客|博客/);
  assert.doesNotMatch(script.segments[1].text, /播客|博客/);
  assert.deepEqual(script.segments[1].display.points, ["1 位 Builder", "1 条精选"]);
  assert.match(script.segments[2].text, /Sam Altman|Sam/);
});

test("generate-script avoids repeating tweet lead-in phrasing in narration", async () => {
  const digest = {
    x: [
      {
        name: "Josh Woodward",
        handle: "joshwoodward",
        bio: "Google",
        avatarUrl: "",
        tweets: [
          {
            id: "1",
            text: "Veo in Gemini can still make videos directly from prompts.",
            createdAt: new Date().toISOString(),
            url: "https://x.com/joshwoodward/status/1",
            likes: 1000,
            retweets: 200,
            replies: 80,
          },
        ],
      },
    ],
    podcasts: [],
    blogs: [],
  };

  const script = await runGenerateScript(digest);
  const tweetSegment = script.segments.find((segment) => segment.type === "tweet");

  assert.equal(
    tweetSegment.text,
    "Josh Woodward 发布的这条动态，主要在讲视频生成能力更新，重点是 Gemini 里的 Veo 视频能力仍然可以直接使用。",
  );
  assert.doesNotMatch(tweetSegment.text, /这条动态主要在讲这条动态主要在讲|主要在讲这条动态主要在讲/);
});

test("generate-script uses GMT+8 for both script metadata and intro copy", async () => {
  const digest = {
    x: [
      {
        name: "Sam Altman",
        handle: "sama",
        bio: "OpenAI",
        avatarUrl: "",
        tweets: [
          {
            id: "1",
            text: "Shipping another model update for coding.",
            createdAt: "2026-03-28T17:30:00.000Z",
            url: "https://x.com/sama/status/1",
            likes: 1000,
            retweets: 200,
            replies: 80,
          },
        ],
      },
    ],
    podcasts: [],
    blogs: [],
  };

  const script = await runGenerateScript(digest, {
    nodeArgs: ["--import", "./scripts/tests/helpers/freeze-date.mjs"],
    env: {
      TZ: "America/Los_Angeles",
      ONEAI_TEST_NOW: "2026-03-28T18:30:00.000Z",
    },
  });

  assert.equal(script.date, "2026-03-29");
  assert.equal(script.segments[0].display.subtitle, "2026年3月29日");
  assert.match(script.segments[0].text, /今天是2026年3月29日/);
});
