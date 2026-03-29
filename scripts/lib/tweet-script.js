const TOPIC_RULES = [
  {
    patterns: ["stargate", "steel beams", "site", "oracle", "related digital"],
    text: "这条动态主要在讲 AI 基础设施建设进展，重点是 Stargate 相关项目已经进入现场施工阶段。",
    subtitle: "Stargate 基建进入施工",
  },
  {
    patterns: ["veo", "gemini", "make videos", "video"],
    text: "这条动态主要在讲视频生成能力更新，重点是 Gemini 里的 Veo 视频能力仍然可以直接使用。",
    subtitle: "Gemini 视频能力更新",
  },
  {
    patterns: ["openclaw", "mcp", "message channel", "connect"],
    text: "这条动态主要在讲 MCP 接入方案，重点是 OpenClaw 可以作为新的工具连接方式来使用。",
    subtitle: "OpenClaw 接入 MCP",
  },
  {
    patterns: ["cowork", "designer", "episode", "anthropic"],
    text: "这条动态主要在推荐 Claude Cowork 的使用方法，重点是通过真实设计流程展示它如何进入团队协作。",
    subtitle: "Claude 协作方法分享",
  },
  {
    patterns: ["attention deficit", "claude code", "task switching", "multiple ais"],
    text: "这条动态主要在讨论 AI 工作流带来的注意力切换问题，重点是多会话协作正在明显放大信息负担。",
    subtitle: "AI 工作流的信息负担",
  },
  {
    patterns: ["compound engineering", "engineering philosophy", "ai age"],
    text: "这条动态主要在分享 AI 时代的工程方法论，重点是用复合式工程方式来组织智能体、工具和协作流程。",
    subtitle: "AI 时代的工程方法",
  },
  {
    patterns: ["launch", "released", "release", "announcing", "available", "live"],
    text: "这条动态主要在讲产品或能力上线，重点是一个值得继续跟踪的新发布方向。",
    subtitle: "产品能力上线更新",
  },
  {
    patterns: ["agent", "workflow", "automation", "cli", "tooling"],
    text: "这条动态主要在讲 AI 工作流和开发工具，重点是如何把新能力接进真实执行链路。",
    subtitle: "AI 工作流与工具链",
  },
];

const ENTITY_HINTS = [
  "Claude",
  "Claude Cowork",
  "Gemini",
  "Veo",
  "OpenClaw",
  "MCP",
  "Linear",
  "Stargate",
  "Oracle",
  "YC",
  "Seedance",
  "AnyGen",
];

const LEADING_TWEET_SUMMARY_PATTERN = /^(?:[^，。！？,:：]{0,24}\s*)?这条(?:动态|更新)/;

function clampText(text, maxChars) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (clean.length <= maxChars) return clean;
  return `${clean.slice(0, maxChars).trim()}...`;
}

function extractEntities(text) {
  const matched = ENTITY_HINTS.filter((entity) =>
    String(text || "").toLowerCase().includes(entity.toLowerCase()),
  );

  return matched.slice(0, 2);
}

export function shouldUseChineseRewrite(text) {
  const value = String(text || "");
  const cjkCount = (value.match(/[\u4e00-\u9fff]/g) || []).length;
  return cjkCount >= 6;
}

export function formatTweetNarration(authorName, chineseText) {
  const speaker = String(authorName || "这位作者").trim() || "这位作者";
  const cleanText = String(chineseText || "").replace(/\s+/g, " ").trim();
  const strippedLeadIn = cleanText.replace(LEADING_TWEET_SUMMARY_PATTERN, "").trim();
  const narrationBody = (strippedLeadIn || cleanText).replace(/^[，。！？、,:：\s]+/, "");

  return `${speaker} 发布的这条动态，${narrationBody}`;
}

export function buildChineseTweetCopy(item) {
  const sourceText = String(item.bestText || "");
  const normalized = sourceText.toLowerCase();
  const matchedRule = TOPIC_RULES.find((rule) =>
    rule.patterns.some((pattern) => normalized.includes(pattern)),
  );

  if (matchedRule) {
    return {
      text: matchedRule.text,
      subtitle: matchedRule.subtitle,
    };
  }

  const entities = extractEntities(sourceText);
  const entityText = entities.length > 0 ? entities.join("、") : "这条动态";

  return {
    text: `${entityText} 这条更新主要在分享一个值得关注的 AI 产品进展或工作流判断，重点是后续还有继续跟进的价值。`,
    subtitle: clampText(
      entities.length > 0 ? `${entityText} 相关更新` : "值得关注的 AI 更新",
      20,
    ),
  };
}
