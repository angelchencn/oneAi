import { existsSync } from "fs";
import { createRequire } from "module";

const DEFAULT_MCP_URL = process.env.CHROME_MCP_URL || "http://127.0.0.1:12306/mcp";

const require = createRequire(import.meta.url);

function resolveBridgeModulePath() {
  const candidates = [
    process.env.MCP_CHROME_BRIDGE_ROOT
      ? `${process.env.MCP_CHROME_BRIDGE_ROOT}/dist/agent/tool-bridge.js`
      : null,
    new URL("../node_modules/mcp-chrome-bridge/dist/agent/tool-bridge.js", import.meta.url).pathname,
    "/opt/homebrew/lib/node_modules/mcp-chrome-bridge/dist/agent/tool-bridge.js",
    "/usr/local/lib/node_modules/mcp-chrome-bridge/dist/agent/tool-bridge.js",
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }

  throw new Error(
    "mcp-chrome-bridge is not available. Install it locally or globally, or set MCP_CHROME_BRIDGE_ROOT.",
  );
}

function loadBridgeClass() {
  const modulePath = resolveBridgeModulePath();
  const mod = require(modulePath);
  if (!mod.AgentToolBridge) {
    throw new Error(`AgentToolBridge export not found in ${modulePath}`);
  }
  return mod.AgentToolBridge;
}

function extractTextContent(result) {
  const textParts = (result?.content || [])
    .filter((item) => item.type === "text" && typeof item.text === "string")
    .map((item) => item.text);

  return textParts.join("\n").trim();
}

function parseJsonText(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Failed to parse MCP tool response: ${error.message}`);
  }
}

export class ChromeMcpClient {
  constructor({ mcpUrl = DEFAULT_MCP_URL } = {}) {
    const AgentToolBridge = loadBridgeClass();
    this.bridge = new AgentToolBridge({ mcpUrl });
    this.mcpUrl = mcpUrl;
  }

  async callTool(tool, args = {}) {
    try {
      return await this.bridge.callTool({ tool, args });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/ECONNREFUSED|fetch failed|connect/i.test(message)) {
        throw new Error(
          `Chrome MCP server is unavailable at ${this.mcpUrl}. Start the Chrome MCP extension/native host and retry.`,
        );
      }
      throw error;
    }
  }

  async callJsonTool(tool, args = {}) {
    const result = await this.callTool(tool, args);
    const text = extractTextContent(result);

    if (result?.isError) {
      throw new Error(text || `MCP tool failed: ${tool}`);
    }

    return text ? parseJsonText(text) : {};
  }

  async assertAvailable() {
    await this.callJsonTool("get_windows_and_tabs", {});
  }

  async close() {
    await this.bridge?.client?.close?.();
  }
}
