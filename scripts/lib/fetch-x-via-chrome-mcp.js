import { renderAccountHtml } from "./render-x-html.js";
import {
  buildDailyPaths,
  saveImageAsset,
  sanitizeHandle,
  writeHtmlFile,
  writeJsonFile,
} from "./x-storage.js";
import { ChromeMcpClient } from "./chrome-mcp-client.js";

function buildLocalDayWindow(date) {
  const [year, month, day] = String(date).split("-").map(Number);
  const start = new Date(year, month - 1, day, 0, 0, 0, 0);
  const end = new Date(year, month - 1, day + 1, 0, 0, 0, 0);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

function normalizeText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

export function normalizeTweetUrl({ handle, tweetId, rawUrl }) {
  const cleanHandle = sanitizeHandle(handle);
  const cleanTweetId = String(tweetId || "").trim();

  if (cleanHandle && cleanTweetId) {
    return `https://x.com/${cleanHandle}/status/${cleanTweetId}`;
  }

  return String(rawUrl || "").trim();
}

function parseMaybeJson(value) {
  if (value && typeof value === "object") return value;
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function createEmptyAccount(builder) {
  return {
    source: "x",
    name: builder.name,
    handle: builder.handle,
    bio: "",
    avatarUrl: "",
    tweets: [],
  };
}

function buildArchivePayload({ date, generatedAt, account, errors = [] }) {
  return {
    date,
    generatedAt,
    handle: account.handle,
    name: account.name,
    bio: account.bio || "",
    avatarUrl: account.avatarUrl || "",
    tweets: account.tweets || [],
    errors,
  };
}

function buildExtractionScript({ handle, startIso, endIso }) {
  return `
const targetHandle = ${JSON.stringify(sanitizeHandle(handle).toLowerCase())};
const startMs = new Date(${JSON.stringify(startIso)}).getTime();
const endMs = new Date(${JSON.stringify(endIso)}).getTime();
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const parseMetric = (value) => {
  const text = String(value || "").replace(/,/g, "").trim();
  const match = text.match(/([0-9]+(?:\\.[0-9]+)?)\\s*([KMB])?/i);
  if (!match) return 0;
  const number = Number(match[1]);
  const suffix = (match[2] || "").toUpperCase();
  if (suffix === "K") return Math.round(number * 1000);
  if (suffix === "M") return Math.round(number * 1000000);
  if (suffix === "B") return Math.round(number * 1000000000);
  return Math.round(number);
};
const getMetricByTestId = (article, testId) => {
  const node = article.querySelector('[data-testid="' + testId + '"]');
  if (!node) return 0;
  const aria = node.getAttribute("aria-label") || node.innerText || "";
  return parseMetric(aria);
};
const getTweetText = (article) => {
  const parts = Array.from(article.querySelectorAll('[data-testid="tweetText"]'))
    .map((node) => (node.innerText || "").trim())
    .filter(Boolean);
  return parts.join("\\n").trim();
};
const getTweetImages = (article) => {
  const seen = new Set();
  return Array.from(article.querySelectorAll('[data-testid="tweetPhoto"] img'))
    .map((img) => ({
      url: img.currentSrc || img.src || "",
      alt: img.alt || "",
    }))
    .filter((item) => {
      if (!item.url || seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });
};
const getTweetUrl = (article) => {
  const anchor = article.querySelector('a[href*="/status/"]');
  return anchor ? anchor.href : "";
};
const extractTweet = (article) => {
  const url = getTweetUrl(article);
  const match = url.match(/\\/status\\/(\\d+)/);
  const id = match ? match[1] : "";
  const createdAt = article.querySelector("time")?.getAttribute("datetime") || "";
  const createdMs = createdAt ? new Date(createdAt).getTime() : NaN;
  const text = getTweetText(article);
  const articleText = (article.innerText || "").trim();
  const socialContext = article.querySelector('[data-testid="socialContext"]')?.innerText || "";
  const isReply = /replying to/i.test(articleText);
  const isRetweet = /reposted/i.test(socialContext);
  const isOwnTweet = url.includes("/" + targetHandle + "/status/");

  return {
    id,
    url,
    createdAt,
    createdMs,
    text,
    likes: getMetricByTestId(article, "like"),
    retweets: getMetricByTestId(article, "retweet"),
    replies: getMetricByTestId(article, "reply"),
    images: getTweetImages(article),
    isReply,
    isRetweet,
    isOwnTweet,
  };
};
const collectTweets = () => {
  return Array.from(document.querySelectorAll('article[data-testid="tweet"]'))
    .map(extractTweet)
    .filter((tweet) => tweet.id && tweet.url && tweet.createdAt);
};
const waitForTimeline = async () => {
  for (let attempt = 0; attempt < 15; attempt += 1) {
    if (document.querySelector('article[data-testid="tweet"]')) return true;
    await wait(1000);
  }
  return false;
};
const ready = await waitForTimeline();
const seen = new Map();
let reachedOlderTweets = false;
for (let scrollIndex = 0; scrollIndex < 8; scrollIndex += 1) {
  const tweets = collectTweets();
  for (const tweet of tweets) {
    seen.set(tweet.id, tweet);
    if (Number.isFinite(tweet.createdMs) && tweet.createdMs < startMs) {
      reachedOlderTweets = true;
    }
  }
  if (reachedOlderTweets) break;
  window.scrollTo(0, document.body.scrollHeight);
  await wait(1400);
}
const bio = document.querySelector('[data-testid="UserDescription"]')?.innerText || "";
const avatarUrl =
  document.querySelector('a[href$="/photo"] img')?.currentSrc ||
  document.querySelector('img[src*="profile_images"]')?.currentSrc ||
  "";
const tweets = Array.from(seen.values())
  .filter((tweet) => Number.isFinite(tweet.createdMs))
  .filter((tweet) => tweet.createdMs >= startMs && tweet.createdMs < endMs)
  .filter((tweet) => !tweet.isReply)
  .filter((tweet) => !tweet.isRetweet)
  .filter((tweet) => tweet.isOwnTweet)
  .map((tweet) => ({
    id: tweet.id,
    text: tweet.text,
    createdAt: tweet.createdAt,
    url: tweet.url,
    likes: tweet.likes,
    retweets: tweet.retweets,
    replies: tweet.replies,
    images: tweet.images,
  }))
  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
return {
  success: ready,
  bio,
  avatarUrl,
  tweets,
};
`;
}

async function fetchAccountData(client, builder, windowRange) {
  const profileUrl = `https://x.com/${sanitizeHandle(builder.handle)}`;
  await client.callJsonTool("chrome_navigate", {
    url: profileUrl,
    background: false,
  });

  const response = await client.callJsonTool("chrome_javascript", {
    code: buildExtractionScript({
      handle: builder.handle,
      startIso: windowRange.startIso,
      endIso: windowRange.endIso,
    }),
    timeoutMs: 45000,
    maxOutputBytes: 200000,
  });

  if (!response.success) {
    const errorMessage =
      response.error?.message ||
      "Chrome MCP JavaScript extraction failed";
    throw new Error(errorMessage);
  }

  const payload = parseMaybeJson(response.result);
  if (!payload || typeof payload !== "object") {
    throw new Error("Chrome MCP returned an invalid JavaScript payload");
  }

  return {
    bio: normalizeText(payload.bio || ""),
    avatarUrl: String(payload.avatarUrl || ""),
    tweets: ensureArray(payload.tweets)
      .map((tweet) => ({
        id: String(tweet.id || ""),
        text: normalizeText(tweet.text || "").slice(0, 500),
        createdAt: String(tweet.createdAt || ""),
        url: normalizeTweetUrl({
          handle: builder.handle,
          tweetId: tweet.id,
          rawUrl: tweet.url,
        }),
        likes: Number(tweet.likes || 0),
        retweets: Number(tweet.retweets || 0),
        replies: Number(tweet.replies || 0),
        images: ensureArray(tweet.images).map((image) => ({
          url: String(image.url || ""),
          alt: String(image.alt || ""),
        })),
      }))
      .filter((tweet) => tweet.id && tweet.text && tweet.url && tweet.createdAt),
  };
}

async function hydrateTweetImages(dataDir, { date, handle, tweets }) {
  const hydratedTweets = [];

  for (const tweet of tweets) {
    const savedImages = [];
    const images = ensureArray(tweet.images);

    for (let index = 0; index < images.length; index += 1) {
      const image = images[index];
      if (!image.url) continue;

      try {
        const localPath = await saveImageAsset(dataDir, {
          date,
          handle,
          tweetId: tweet.id,
          index: index + 1,
          url: image.url,
        });
        savedImages.push({
          url: image.url,
          alt: image.alt || "",
          localPath,
        });
      } catch (error) {
        // Keep the tweet even if one image fails.
      }
    }

    hydratedTweets.push({
      ...tweet,
      images: savedImages,
    });
  }

  return hydratedTweets;
}

async function archiveAccount(dataDir, { date, generatedAt, account, errors = [] }) {
  const paths = buildDailyPaths({ date, handle: account.handle });
  const rawPayload = buildArchivePayload({
    date,
    generatedAt,
    account,
    errors,
  });

  await writeJsonFile(dataDir, paths.rawFile, rawPayload);
  await writeHtmlFile(
    dataDir,
    paths.htmlFile,
    renderAccountHtml({
      date,
      generatedAt,
      name: account.name,
      handle: account.handle,
      tweets: account.tweets,
    }),
  );
}

export async function fetchXViaChromeMcp({ builders, date, dataDir }) {
  const generatedAt = new Date().toISOString();
  const client = new ChromeMcpClient();
  await client.assertAvailable();

  const windowRange = buildLocalDayWindow(date);
  const accounts = [];

  for (const builder of builders) {
    const baseAccount = createEmptyAccount(builder);
    try {
      const extracted = await fetchAccountData(client, builder, windowRange);
      const tweets = await hydrateTweetImages(dataDir, {
        date,
        handle: builder.handle,
        tweets: extracted.tweets,
      });

      const account = {
        ...baseAccount,
        bio: extracted.bio,
        avatarUrl: extracted.avatarUrl,
        tweets,
      };

      await archiveAccount(dataDir, {
        date,
        generatedAt,
        account,
      });

      console.log(`  [${tweets.length > 0 ? "OK" : "EMPTY"}] @${builder.handle}: ${tweets.length} tweets`);
      accounts.push(account);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await archiveAccount(dataDir, {
        date,
        generatedAt,
        account: baseAccount,
        errors: [message],
      });
      console.log(`  [FAIL] @${builder.handle}: ${message}`);
      accounts.push(baseAccount);
    }
  }

  return accounts;
}
