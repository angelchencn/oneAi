#!/usr/bin/env node

// ============================================================================
// Follow Builders — Fetch Feeds
// ============================================================================
// Manually triggered: fetches latest data from RSS feeds and saves locally.
// Twitter/X via Chrome MCP, podcasts and blogs via RSS.
// ============================================================================

import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { fetchXViaChromeMcp } from "./lib/fetch-x-via-chrome-mcp.js";
import { buildFeedX } from "./lib/x-feed-export.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");

// ---------------------------------------------------------------------------
// Builder list (X/Twitter handles)
// ---------------------------------------------------------------------------

const BUILDERS = [
  { name: "Andrej Karpathy", handle: "karpathy" },
  { name: "Sam Altman", handle: "sama" },
  { name: "Swyx", handle: "swyx" },
  { name: "Guillermo Rauch", handle: "rauchg" },
  { name: "Amjad Masad", handle: "amasad" },
  { name: "Aaron Levie", handle: "levie" },
  { name: "Garry Tan", handle: "garrytan" },
  { name: "Alex Albert", handle: "alexalbert__" },
  { name: "Josh Woodward", handle: "joshwoodward" },
  { name: "Peter Yang", handle: "petergyang" },
  { name: "Nan Yu", handle: "thenanyu" },
  { name: "Cat Wu", handle: "_catwu" },
  { name: "Thariq", handle: "trq212" },
  { name: "Matt Turck", handle: "mattturck" },
  { name: "Zara Zhang", handle: "zarazhangrui" },
  { name: "Nikunj Kothari", handle: "nikunj" },
  { name: "Peter Steinberger", handle: "steipete" },
  { name: "Dan Shipper", handle: "danshipper" },
  { name: "Aditya Agarwal", handle: "adityaag" },
  { name: "Claude", handle: "claudeai" },
];

// ---------------------------------------------------------------------------
// Podcast RSS feeds
// ---------------------------------------------------------------------------

const PODCASTS = [
  {
    name: "Latent Space",
    rss: "https://api.substack.com/feed/podcast/1084089.rss",
  },
  {
    name: "Training Data",
    rss: "https://feeds.megaphone.fm/trainingdata",
  },
  {
    name: "No Priors",
    rss: "https://feeds.megaphone.fm/nopriors",
  },
  {
    name: "Unsupervised Learning",
    rss: "https://www.omnycontent.com/d/playlist/070af456-729b-4a0f-9c09-a6c100397b59/3b159371-276d-429e-ae86-a6c1003b01c4/7b61d4e1-bd3d-4d3f-97c2-a6c1003b01c9/podcast.rss",
  },
  {
    name: "The MAD Podcast",
    rss: "https://anchor.fm/s/f2ee4948/podcast/rss",
  },
];

// ---------------------------------------------------------------------------
// Blog RSS feeds
// ---------------------------------------------------------------------------

const BLOGS = [
  {
    name: "Anthropic Engineering",
    rss: "https://raw.githubusercontent.com/Olshansk/rss-feeds/refs/heads/main/feeds/feed_anthropic_engineering.xml",
  },
];

// ---------------------------------------------------------------------------
// Simple XML parser (no dependencies)
// ---------------------------------------------------------------------------

function extractTag(xml, tag) {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = xml.match(regex);
  return match ? match[1].trim() : "";
}

function extractCDATA(text) {
  const match = text.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  return match ? match[1].trim() : text;
}

function extractAllItems(xml) {
  const items = [];
  const regex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    items.push(match[1]);
  }
  return items;
}

function extractLink(itemXml) {
  // Try <link> tag first
  const link = extractTag(itemXml, "link");
  if (link) return extractCDATA(link);
  // Try enclosure url
  const encMatch = itemXml.match(/<enclosure[^>]+url="([^"]+)"/);
  return encMatch ? encMatch[1] : "";
}

function extractPubDate(itemXml) {
  const pubDate = extractTag(itemXml, "pubDate");
  if (pubDate) return new Date(extractCDATA(pubDate)).toISOString();
  const dcDate = extractTag(itemXml, "dc:date");
  if (dcDate) return new Date(extractCDATA(dcDate)).toISOString();
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Load .env file (simple parser, no dependencies)
// ---------------------------------------------------------------------------

async function loadEnv() {
  const envPath = join(__dirname, "..", ".env");
  if (!existsSync(envPath)) return;
  const content = await readFile(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function fetchRSS(url) {
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// ---------------------------------------------------------------------------
// Fetch Podcasts
// ---------------------------------------------------------------------------

async function fetchPodcast(podcast) {
  const lookbackMs = 72 * 60 * 60 * 1000;
  const cutoff = new Date(Date.now() - lookbackMs);

  try {
    const xml = await fetchRSS(podcast.rss);
    const items = extractAllItems(xml);

    const episodes = items
      .slice(0, 5)
      .map((item) => {
        const title = extractCDATA(extractTag(item, "title"));
        const description = extractCDATA(extractTag(item, "description"))
          .replace(/<[^>]+>/g, "")
          .replace(/&amp;/g, "&")
          .trim();
        const link = extractLink(item);
        const pubDate = extractPubDate(item);

        return {
          source: "podcast",
          name: podcast.name,
          title,
          url: link,
          publishedAt: pubDate,
          description: description.slice(0, 1000),
        };
      })
      .filter((ep) => new Date(ep.publishedAt) > cutoff);

    console.log(`  [OK] ${podcast.name}: ${episodes.length} episodes`);
    return episodes;
  } catch (err) {
    console.log(`  [FAIL] ${podcast.name}: ${err.message}`);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Fetch Blogs
// ---------------------------------------------------------------------------

async function fetchBlog(blog) {
  const lookbackMs = 72 * 60 * 60 * 1000;
  const cutoff = new Date(Date.now() - lookbackMs);

  try {
    const xml = await fetchRSS(blog.rss);
    const items = extractAllItems(xml);

    const posts = items
      .slice(0, 5)
      .map((item) => {
        const title = extractCDATA(extractTag(item, "title"));
        const description = extractCDATA(extractTag(item, "description"))
          .replace(/<[^>]+>/g, "")
          .replace(/&amp;/g, "&")
          .trim();
        const link = extractLink(item);
        const pubDate = extractPubDate(item);

        return {
          source: "blog",
          name: blog.name,
          title,
          url: link,
          publishedAt: pubDate,
          summary: description.slice(0, 500),
        };
      })
      .filter((post) => new Date(post.publishedAt) > cutoff);

    console.log(`  [OK] ${blog.name}: ${posts.length} posts`);
    return posts;
  } catch (err) {
    console.log(`  [FAIL] ${blog.name}: ${err.message}`);
    return [];
  }
}

function getLocalDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== Fetch Feeds ===\n");

  await loadEnv();
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true });

  // 1. Fetch Twitter/X via Chrome MCP
  const fetchDate = getLocalDateString();
  console.log(`Fetching X/Twitter via Chrome MCP for ${fetchDate}...`);
  const xResults = await fetchXViaChromeMcp({
    builders: BUILDERS,
    date: fetchDate,
    dataDir: DATA_DIR,
  });

  const feedX = buildFeedX({
    generatedAt: new Date().toISOString(),
    lookbackHours: 24,
    accounts: xResults,
  });

  await writeFile(join(DATA_DIR, "feed-x.json"), JSON.stringify(feedX, null, 2));
  console.log(`\nX/Twitter: ${feedX.stats.xBuilders} builders, ${feedX.stats.totalTweets} tweets\n`);

  // 2. Fetch Podcasts
  console.log("Fetching Podcasts via RSS...");
  const allEpisodes = [];
  for (const podcast of PODCASTS) {
    const episodes = await fetchPodcast(podcast);
    allEpisodes.push(...episodes);
  }

  const feedPodcasts = {
    generatedAt: new Date().toISOString(),
    lookbackHours: 72,
    podcasts: allEpisodes,
    stats: {
      podcastEpisodes: allEpisodes.length,
    },
  };

  await writeFile(join(DATA_DIR, "feed-podcasts.json"), JSON.stringify(feedPodcasts, null, 2));
  console.log(`\nPodcasts: ${feedPodcasts.stats.podcastEpisodes} episodes\n`);

  // 3. Fetch Blogs
  console.log("Fetching Blogs via RSS...");
  const allPosts = [];
  for (const blog of BLOGS) {
    const posts = await fetchBlog(blog);
    allPosts.push(...posts);
  }

  const feedBlogs = {
    generatedAt: new Date().toISOString(),
    lookbackHours: 72,
    blogs: allPosts,
    stats: {
      blogPosts: allPosts.length,
    },
  };

  await writeFile(join(DATA_DIR, "feed-blogs.json"), JSON.stringify(feedBlogs, null, 2));
  console.log(`\nBlogs: ${feedBlogs.stats.blogPosts} posts\n`);

  // Summary
  console.log("========================================");
  console.log(" Fetch Complete");
  console.log("========================================");
  console.log(`  Builders: ${feedX.stats.xBuilders} with tweets (${feedX.stats.totalTweets} total)`);
  console.log(`  Podcasts: ${feedPodcasts.stats.podcastEpisodes} episodes`);
  console.log(`  Blogs:    ${feedBlogs.stats.blogPosts} posts`);
  console.log(`  Data dir: ${DATA_DIR}`);
  console.log("========================================\n");
}

main().catch((err) => {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
});
