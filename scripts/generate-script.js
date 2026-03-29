#!/usr/bin/env node

// ============================================================================
// OneAI — Generate Script
// ============================================================================
// Reads prepare-digest.js output from stdin, ranks the most useful updates,
// and transforms them into a Chinese short-video script.
// Uses Anthropic/OpenAI when configured, otherwise falls back to heuristics.
// ============================================================================

const MAX_DURATION_SECONDS = 300;
const CHARS_PER_SECOND = 4.2;
const MAX_TWEETS = 8;
const MIN_TWEET_SEGMENTS = 4;
const MAX_TEXT_CHARS = 120;
import {
  buildChineseTweetCopy,
  formatTweetNarration,
  shouldUseChineseRewrite,
} from "./lib/tweet-script.js";
import {
  formatChinaDisplayDate,
  getChinaDateStamp,
} from "./lib/china-time.js";

const KEYWORD_WEIGHTS = [
  ["launch", 2.5],
  ["released", 2.5],
  ["release", 2.3],
  ["announce", 2.2],
  ["announcing", 2.2],
  ["shipping", 2.1],
  ["api", 2.1],
  ["sdk", 1.8],
  ["model", 2.0],
  ["agent", 1.8],
  ["agents", 1.8],
  ["open source", 2.0],
  ["benchmark", 1.7],
  ["eval", 1.6],
  ["reasoning", 1.6],
  ["coding", 1.6],
  ["inference", 1.5],
  ["voice", 1.5],
  ["video", 1.4],
  ["multimodal", 1.6],
  ["dataset", 1.3],
  ["workflow", 1.2],
  ["deploy", 1.2],
  ["production", 1.2],
  ["paper", 1.1],
  ["research", 1.1],
  ["发布", 2.5],
  ["上线", 2.4],
  ["开源", 2.3],
  ["模型", 2.0],
  ["智能体", 1.9],
  ["推理", 1.7],
  ["编码", 1.5],
  ["多模态", 1.5],
  ["评测", 1.4],
  ["工作流", 1.2],
];

function parseJSON(text, label) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Failed to parse ${label}: ${error.message}`);
  }
}

function estimateDuration(text) {
  const cnChars = String(text || "").replace(/[a-zA-Z\s\d]/g, "").length;
  const enWords = (String(text || "").match(/[a-zA-Z]+/g) || []).length;
  return cnChars / CHARS_PER_SECOND + enWords / 2.5;
}

function totalDuration(segments) {
  return segments.reduce((sum, seg) => sum + estimateDuration(seg.text), 0);
}

function clampText(text, maxChars) {
  const clean = String(text || "")
    .replace(/\s+/g, " ")
    .replace(/https?:\/\/\S+/g, "")
    .trim();

  if (clean.length <= maxChars) return clean;

  const slice = clean.slice(0, maxChars);
  const breakChars = [".", ",", ";", ":", "!", "?", "。", "，", "；", "："];
  for (let i = slice.length - 1; i >= Math.max(0, slice.length - 20); i -= 1) {
    if (breakChars.includes(slice[i])) {
      return `${slice.slice(0, i).trim()}...`;
    }
  }

  return `${slice.trim()}...`;
}

function toSlug(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function hoursAgo(isoString) {
  if (!isoString) return 999;
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 999;
  return Math.max(0, (Date.now() - date.getTime()) / (1000 * 60 * 60));
}

function recencyScore(isoString, freshnessHours) {
  const age = Math.min(hoursAgo(isoString), freshnessHours);
  return (freshnessHours - age) / freshnessHours;
}

function keywordScore(text) {
  const haystack = String(text || "").toLowerCase();
  let score = 0;
  for (const [keyword, weight] of KEYWORD_WEIGHTS) {
    if (haystack.includes(String(keyword).toLowerCase())) score += weight;
  }
  return score;
}

function tweetEngagementScore(tweet) {
  const likes = Number(tweet.likes || 0);
  const retweets = Number(tweet.retweets || 0);
  const replies = Number(tweet.replies || 0);
  return Math.log1p(likes + retweets * 3 + replies * 2);
}

function compactBullet(text, maxChars = 20) {
  return clampText(String(text || "").replace(/["“”]/g, ""), maxChars);
}

function splitSentences(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?。！？])\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function selectBestTweet(builder) {
  const rankedTweets = (builder.tweets || [])
    .map((tweet) => {
      const text = clampText(tweet.text || "", 260);
      const score =
        keywordScore(text) * 3 +
        tweetEngagementScore(tweet) * 2 +
        recencyScore(tweet.createdAt, 24) * 4;

      return {
        ...tweet,
        text,
        score,
      };
    })
    .filter((tweet) => tweet.text.length >= 20)
    .sort((a, b) => b.score - a.score);

  if (rankedTweets.length === 0) return null;
  const best = rankedTweets[0];

  return {
    sourceType: "tweet",
    name: builder.name,
    handle: builder.handle,
    bio: builder.bio || "",
    avatarUrl: builder.avatarUrl || "",
    bestText: best.text,
    url: best.url,
    createdAt: best.createdAt,
    score: best.score,
  };
}

function curateDigest(digest) {
  const tweets = (digest.x || [])
    .map(selectBestTweet)
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_TWEETS);

  return {
    tweets,
    stats: {
      builders: tweets.length,
      podcasts: 0,
      blogs: 0,
      totalItems: tweets.length,
    },
  };
}

function buildIntroSegment(curated, scriptDate) {
  const date = formatChinaDisplayDate(scriptDate);
  return {
    id: "intro",
    type: "intro",
    text: `欢迎收看今天的 AI 日报。今天是${date}。我从 ${curated.stats.builders} 位 AI 从业者动态里，筛出最值得你花三到五分钟了解的重点。`,
    display: {
      title: "AI 每日更新",
      subtitle: date,
    },
  };
}

function buildOverviewSegment(curated) {
  return {
    id: "overview",
    type: "overview",
    text: `今日速览：一共精选 ${curated.stats.totalItems} 条 Twitter 更新，重点覆盖模型发布、产品上线、工程实践和行业判断。先看今天最值得关注的人和项目。`,
    display: {
      title: "今日速览",
      points: [
        `${curated.stats.builders} 位 Builder`,
        `${curated.stats.totalItems} 条精选`,
      ],
    },
  };
}

function buildTweetSegment(item) {
  const chineseCopy = buildChineseTweetCopy(item);
  const authorName = item.name || item.handle || "这位作者";
  const narration = formatTweetNarration(authorName, chineseCopy.text);

  return {
    id: `tweet-${item.handle}`,
    type: "tweet",
    text: narration,
    display: {
      title: item.name,
      subtitle: compactBullet(chineseCopy.subtitle, 24),
      avatarUrl: item.avatarUrl || undefined,
      avatarFallback: item.name?.[0] || "?",
      qrUrl: item.url || undefined,
    },
  };
}

function buildOutroSegment() {
  return {
    id: "outro",
    type: "outro",
    text: "以上就是今天最值得跟进的 AI 更新。如果你想每天用几分钟跟上模型、产品和工程节奏，记得继续关注。我们明天见。",
    display: {
      title: "感谢收看",
      subtitle: "明天继续更新",
    },
  };
}

function getLlmConfig() {
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      provider: "anthropic",
      model: process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest",
      apiKey: process.env.ANTHROPIC_API_KEY,
    };
  }

  if (process.env.OPENAI_API_KEY) {
    return {
      provider: "openai",
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      apiKey: process.env.OPENAI_API_KEY,
    };
  }

  return null;
}

function buildLlmPayload(curated) {
  return {
    tweets: curated.tweets.map((item) => ({
      id: `tweet-${item.handle}`,
      type: "tweet",
      name: item.name,
      handle: item.handle,
      bio: item.bio,
      text: item.bestText,
    })),
  };
}

function llmPrompt(payload) {
  return [
    "你是中文 AI 短视频栏目编导。",
    "请把输入素材改写成适合 3 到 5 分钟竖屏日报的 JSON。",
    "要求：",
    "1. 全部输出为简体中文。",
    "2. 只输出 JSON，不要 markdown。",
    '3. JSON 结构必须是 {"segments":[{"id":"","type":"","text":"","display":{"subtitle":"","points":[]}}]}。',
    "4. 不能新增或删除 id/type，只能为输入条目补足中文口播与显示文案。",
    "5. text 要自然、紧凑、信息密度高，不要套话。",
    "6. tweet 的 subtitle 控制在 20 到 36 字。",
    "",
    JSON.stringify(payload, null, 2),
  ].join("\n");
}

async function callAnthropic(config, payload) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 2400,
      temperature: 0.3,
      messages: [{ role: "user", content: llmPrompt(payload) }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic HTTP ${response.status}: ${await response.text()}`);
  }

  const body = await response.json();
  const text = (body.content || [])
    .filter((item) => item.type === "text")
    .map((item) => item.text)
    .join("\n");
  return parseJSON(text, "Anthropic response JSON");
}

async function callOpenAI(config, payload) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      input: llmPrompt(payload),
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI HTTP ${response.status}: ${await response.text()}`);
  }

  const body = await response.json();
  return parseJSON(body.output_text || "", "OpenAI response JSON");
}

async function rewriteWithLlm(curated) {
  const config = getLlmConfig();
  if (!config) return null;

  const payload = buildLlmPayload(curated);
  const result = config.provider === "anthropic"
    ? await callAnthropic(config, payload)
    : await callOpenAI(config, payload);

  if (!result?.segments || !Array.isArray(result.segments)) {
    throw new Error("LLM response did not include a valid segments array");
  }

  return result.segments;
}

function mergeLlmSegments(baseSegments, llmSegments) {
  const llmById = new Map(llmSegments.map((segment) => [segment.id, segment]));

  return baseSegments.map((segment) => {
    const llmSegment = llmById.get(segment.id);
    if (!llmSegment) return segment;

    return {
      ...segment,
      text: shouldUseChineseRewrite(llmSegment.text) ? llmSegment.text : segment.text,
      display: {
        ...segment.display,
        ...(llmSegment.display || {}),
        subtitle: shouldUseChineseRewrite(llmSegment.display?.subtitle)
          ? llmSegment.display.subtitle
          : segment.display.subtitle,
      },
    };
  });
}

function trimTweetSegments(segments) {
  const tweetSegments = segments.filter((s) => s.type === "tweet");
  const nonTweetSegments = segments.filter((s) => s.type !== "tweet");

  let kept = tweetSegments;
  while (
    totalDuration([...nonTweetSegments, ...kept]) > MAX_DURATION_SECONDS &&
    kept.length > MIN_TWEET_SEGMENTS
  ) {
    kept = kept.slice(0, kept.length - 1);
  }

  const keptIds = new Set(kept.map((segment) => segment.id));
  return segments.filter((segment) => segment.type !== "tweet" || keptIds.has(segment.id));
}

function truncateLongText(segments) {
  return segments.map((segment) => {
    if (["intro", "overview", "outro"].includes(segment.type)) return segment;
    if (segment.text.length <= MAX_TEXT_CHARS) return segment;
    return { ...segment, text: clampText(segment.text, MAX_TEXT_CHARS) };
  });
}

function applyDurationBudget(segments) {
  let adjusted = trimTweetSegments(segments);

  if (totalDuration(adjusted) > MAX_DURATION_SECONDS) {
    adjusted = truncateLongText(adjusted);
  }

  return adjusted;
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

async function main() {
  const digest = parseJSON(await readStdin(), "digest JSON from stdin");
  const curated = curateDigest(digest);
  const scriptDate = getChinaDateStamp();

  const baseSegments = [
    buildIntroSegment(curated, scriptDate),
    buildOverviewSegment(curated),
    ...curated.tweets.map((item) => buildTweetSegment(item)),
    buildOutroSegment(),
  ];

  let segments = baseSegments;

  try {
    const llmSegments = await rewriteWithLlm(curated);
    if (llmSegments) {
      segments = mergeLlmSegments(baseSegments, llmSegments);
    }
  } catch (error) {
    process.stderr.write(`[generate-script] LLM rewrite skipped: ${error.message}\n`);
  }

  segments = applyDurationBudget(segments);

  const videoScript = {
    generatedAt: new Date().toISOString(),
    date: scriptDate,
    estimatedDurationSeconds: Math.round(totalDuration(segments)),
    segmentCount: segments.length,
    stats: {
      builders: segments.filter((segment) => segment.type === "tweet").length,
      podcasts: segments.filter((segment) => segment.type === "podcast").length,
      blogs: segments.filter((segment) => segment.type === "blog").length,
    },
    segments,
  };

  process.stdout.write(JSON.stringify(videoScript, null, 2) + "\n");
}

main().catch((error) => {
  process.stderr.write(
    JSON.stringify({ status: "error", message: error.message }) + "\n",
  );
  process.exit(1);
});
