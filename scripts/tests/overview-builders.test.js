import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("generate-video forwards builder names into Remotion props", async () => {
  const source = await readFile("scripts/generate-video.js", "utf8");

  assert.match(source, /import \{ loadBuildersConfig \} from "\.\/lib\/builders-config\.js";/);
  assert.match(
    source,
    /const builderNames = \(await loadBuildersConfig\(\{ rootDir: ROOT \}\)\)\.map\(\(\{ name \}\) => name\);/,
  );
  assert.match(source, /builderNames,/);
});

test("CompositionProps carry builder names into Overview", async () => {
  const typesSource = await readFile("video/src/types.ts", "utf8");
  const rootSource = await readFile("video/src/Root.tsx", "utf8");
  const compositionSource = await readFile("video/src/VideoComposition.tsx", "utf8");
  const overviewSource = await readFile("video/src/components/Overview.tsx", "utf8");

  assert.match(typesSource, /builderNames\?: string\[\];/);
  assert.match(rootSource, /builderNames: \[\],/);
  assert.doesNotMatch(compositionSource, /builders=\{/);
  assert.doesNotMatch(compositionSource, /selected=\{/);
  assert.match(compositionSource, /builderNames=\{builderNames\}/);
  assert.doesNotMatch(overviewSource, /builders: number;/);
  assert.match(overviewSource, /builderNames: string\[\];/);
  assert.match(overviewSource, /builderNames\.length/);
  assert.doesNotMatch(overviewSource, /精选动态/);
  assert.match(overviewSource, /builderNames\.map/);
  assert.match(overviewSource, /gridTemplateColumns: "1fr 1fr"/);
});

test("generate-video uses builder config as the single builders source for remotion stats", async () => {
  const source = await readFile("scripts/generate-video.js", "utf8");

  assert.match(source, /builders: builderNames\.length,/);
});
