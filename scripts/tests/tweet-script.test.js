import test from "node:test";
import assert from "node:assert/strict";

import {
  buildChineseTweetCopy,
  formatTweetNarration,
  shouldUseChineseRewrite,
} from "../lib/tweet-script.js";

test("buildChineseTweetCopy returns Chinese narration and subtitle for English tweets", () => {
  const copy = buildChineseTweetCopy({
    name: "Sam Altman",
    handle: "sama",
    bestText: "The first steel beams went up this week at our Michigan Stargate site with Oracle and Related Digital",
  });

  assert.match(copy.text, /[\u4e00-\u9fff]/);
  assert.match(copy.subtitle, /[\u4e00-\u9fff]/);
  assert.doesNotMatch(copy.text, /The first steel beams went up/);
});

test("shouldUseChineseRewrite rejects llm text that is mostly English", () => {
  assert.equal(
    shouldUseChineseRewrite("Sam Altman said the launch is great"),
    false,
  );
  assert.equal(
    shouldUseChineseRewrite("这条动态主要在讲基础设施建设进展"),
    true,
  );
});

test("formatTweetNarration removes duplicated tweet lead-in phrasing", () => {
  assert.equal(
    formatTweetNarration(
      "Josh Woodward",
      "这条动态主要在讲视频生成能力更新，重点是 Gemini 里的 Veo 视频能力仍然可以直接使用。",
    ),
    "Josh Woodward 发布的这条动态，主要在讲视频生成能力更新，重点是 Gemini 里的 Veo 视频能力仍然可以直接使用。",
  );

  assert.equal(
    formatTweetNarration(
      "Peter Yang",
      "Claude、MCP 这条更新主要在分享一个值得关注的 AI 产品进展或工作流判断，重点是后续还有继续跟进的价值。",
    ),
    "Peter Yang 发布的这条动态，主要在分享一个值得关注的 AI 产品进展或工作流判断，重点是后续还有继续跟进的价值。",
  );
});
