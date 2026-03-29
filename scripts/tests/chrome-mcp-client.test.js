import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("ChromeMcpClient preserves server-side transport errors", async () => {
  const tmpRoot = await mkdtemp(join(tmpdir(), "fake-mcp-bridge-"));
  const bridgeDir = join(tmpRoot, "dist", "agent");
  const originalRoot = process.env.MCP_CHROME_BRIDGE_ROOT;

  try {
    await mkdir(bridgeDir, { recursive: true });
    await writeFile(
      join(bridgeDir, "tool-bridge.js"),
      `class AgentToolBridge {
  constructor() {
    this.client = {
      close: async () => {},
    };
  }

  async callTool() {
    throw new Error(
      "Streamable HTTP error: Error POSTing to endpoint: {\\"statusCode\\":500,\\"error\\":\\"Internal Server Error\\",\\"message\\":\\"Already connected to a transport. Call close() before connecting to a new transport, or use a separate Protocol instance per connection.\\"}",
    );
  }
}

module.exports = { AgentToolBridge };
`,
      "utf8",
    );

    process.env.MCP_CHROME_BRIDGE_ROOT = tmpRoot;

    const { ChromeMcpClient } = await import("../lib/chrome-mcp-client.js");
    const client = new ChromeMcpClient();

    await assert.rejects(
      async () => client.assertAvailable(),
      (error) => {
        assert.match(error.message, /Already connected to a transport/);
        assert.doesNotMatch(error.message, /server is unavailable/i);
        return true;
      },
    );

    await client.close();
  } finally {
    if (originalRoot == null) {
      delete process.env.MCP_CHROME_BRIDGE_ROOT;
    } else {
      process.env.MCP_CHROME_BRIDGE_ROOT = originalRoot;
    }

    await rm(tmpRoot, { recursive: true, force: true });
  }
});
