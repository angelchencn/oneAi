import { mkdir, writeFile } from "fs/promises";
import { dirname, extname, join } from "path";

export function sanitizeHandle(handle) {
  return String(handle || "").replace(/^@+/, "").trim();
}

export function buildDailyPaths({ date, handle }) {
  const cleanHandle = sanitizeHandle(handle);
  return {
    rawFile: `x-raw/${date}/${cleanHandle}.json`,
    htmlFile: `x-html/${date}/${cleanHandle}.html`,
    assetDir: `x-assets/${date}/${cleanHandle}`,
  };
}

function sanitizeAssetExtension(url) {
  const extension = extname(new URL(url).pathname).toLowerCase();
  if (extension === ".jpg" || extension === ".jpeg" || extension === ".png" || extension === ".webp" || extension === ".gif") {
    return extension;
  }
  return ".jpg";
}

export async function ensureParentDir(rootDir, relativePath) {
  await mkdir(dirname(join(rootDir, relativePath)), { recursive: true });
}

export async function writeJsonFile(rootDir, relativePath, value) {
  await ensureParentDir(rootDir, relativePath);
  await writeFile(join(rootDir, relativePath), JSON.stringify(value, null, 2));
}

export async function writeHtmlFile(rootDir, relativePath, html) {
  await ensureParentDir(rootDir, relativePath);
  await writeFile(join(rootDir, relativePath), html, "utf-8");
}

export async function saveImageAsset(rootDir, { date, handle, tweetId, index, url }) {
  const cleanHandle = sanitizeHandle(handle);
  const extension = sanitizeAssetExtension(url);
  const relativePath = `x-assets/${date}/${cleanHandle}/${tweetId}-${index}${extension}`;
  await ensureParentDir(rootDir, relativePath);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Image HTTP ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(join(rootDir, relativePath), buffer);
  return relativePath;
}
