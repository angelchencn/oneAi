import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("VideoComposition renders podcast and blog cards when those segment types appear", async () => {
  const source = await readFile("video/src/VideoComposition.tsx", "utf8");

  assert.match(source, /import \{ PodcastCard \} from "\.\/components\/PodcastCard";/);
  assert.match(source, /import \{ BlogCard \} from "\.\/components\/BlogCard";/);
  assert.match(source, /case "podcast":/);
  assert.match(source, /case "blog":/);
});

test("VideoComposition routes podcast and blog scenes through blurred backgrounds", async () => {
  const source = await readFile("video/src/VideoComposition.tsx", "utf8");

  assert.match(source, /segment\.type === "podcast"\s*\|\|\s*segment\.type === "blog"/);
  assert.match(source, /"blur"/);
});

test("VideoComposition uses tweet backdrop assets for blurred tweet backgrounds", async () => {
  const source = await readFile("video/src/VideoComposition.tsx", "utf8");

  assert.match(source, /backdropSrc=/);
  assert.match(source, /segment\.type === "tweet"/);
  assert.match(source, /\? "tweet"/);
  assert.match(source, /segment\.backdropAsset \?\? segment\.backgroundAsset/);
});

test("VideoBg supports a separate backdrop source for blurred tweet scenes", async () => {
  const source = await readFile("video/src/components/VideoBg.tsx", "utf8");

  assert.match(source, /fit\?: "cover" \| "contain" \| "blur" \| "tweet"/);
  assert.match(source, /backdropSrc\?: string/);
  assert.match(source, /const backdropMediaSrc = staticFile\(backdropSrc \?\? src\);/);
  assert.match(source, /fit === "contain" \|\| fit === "blur" \|\| fit === "tweet"/);
  assert.match(source, /fit === "tweet"/);
  assert.match(source, /"blur\(18px\) saturate\(1\.12\) brightness\(0\.72\)"/);
  assert.match(source, /width: "82%"/);
  assert.match(source, /height: "82%"/);
  assert.match(source, /"blur\(6px\) saturate\(1\.24\) brightness\(1\.08\)"/);
  assert.match(source, /"translate\(24%, -18%\) scale\(1\.18\)"/);
  assert.match(source, /"rgba\(4, 10, 18, 0\.04\)"/);
  assert.match(source, /padding: fit === "tweet" \? "140px 80px 260px" : 72/);
  assert.match(source, /fit === "blur"/);
  assert.match(source, /"blur\(32px\) brightness\(0\.32\)"/);
});
