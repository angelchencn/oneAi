import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("fetchXViaChromeMcp closes the Chrome MCP client when fetching completes", async () => {
  const tmpRoot = await mkdtemp(join(tmpdir(), "fake-mcp-bridge-"));
  const bridgeDir = join(tmpRoot, "dist", "agent");
  const dataDir = await mkdtemp(join(tmpdir(), "fetch-x-data-"));
  const originalRoot = process.env.MCP_CHROME_BRIDGE_ROOT;

  try {
    await mkdir(bridgeDir, { recursive: true });
    globalThis.__fakeBridgeState = { closed: 0 };

    await writeFile(
      join(bridgeDir, "tool-bridge.js"),
      `class AgentToolBridge {
  constructor() {
    this.client = {
      close: async () => {
        globalThis.__fakeBridgeState.closed += 1;
      },
    };
  }

  async callTool() {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ windows: [] }),
        },
      ],
    };
  }
}

module.exports = { AgentToolBridge };
`,
      "utf8",
    );

    process.env.MCP_CHROME_BRIDGE_ROOT = tmpRoot;

    const { fetchXViaChromeMcp } = await import("../lib/fetch-x-via-chrome-mcp.js");
    const accounts = await fetchXViaChromeMcp({
      builders: [],
      date: "2026-03-28",
      dataDir,
    });

    assert.deepEqual(accounts, []);
    assert.equal(globalThis.__fakeBridgeState.closed, 1);
  } finally {
    if (originalRoot == null) {
      delete process.env.MCP_CHROME_BRIDGE_ROOT;
    } else {
      process.env.MCP_CHROME_BRIDGE_ROOT = originalRoot;
    }

    delete globalThis.__fakeBridgeState;
    await rm(tmpRoot, { recursive: true, force: true });
    await rm(dataDir, { recursive: true, force: true });
  }
});

test("fetchXViaChromeMcp uses an injected Chrome MCP client without closing it", async () => {
  const tmpRoot = await mkdtemp(join(tmpdir(), "fake-mcp-bridge-"));
  const bridgeDir = join(tmpRoot, "dist", "agent");
  const dataDir = await mkdtemp(join(tmpdir(), "fetch-x-data-"));
  const originalRoot = process.env.MCP_CHROME_BRIDGE_ROOT;
  const injectedCalls = [];
  const injectedClient = {
    async assertAvailable() {
      injectedCalls.push("assertAvailable");
    },
    async callJsonTool(tool) {
      injectedCalls.push(tool);

      if (tool === "chrome_javascript") {
        return {
          success: true,
          result: {
            bio: "Injected client bio",
            avatarUrl: "",
            tweets: [],
          },
        };
      }

      return { success: true };
    },
    async close() {
      injectedCalls.push("close");
    },
  };

  try {
    await mkdir(bridgeDir, { recursive: true });
    globalThis.__fakeBridgeState = { closed: 0 };

    await writeFile(
      join(bridgeDir, "tool-bridge.js"),
      `class AgentToolBridge {
  constructor() {
    this.client = {
      close: async () => {
        globalThis.__fakeBridgeState.closed += 1;
      },
    };
  }

  async callTool() {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ windows: [] }),
        },
      ],
    };
  }
}

module.exports = { AgentToolBridge };
`,
      "utf8",
    );

    process.env.MCP_CHROME_BRIDGE_ROOT = tmpRoot;

    const { fetchXViaChromeMcp } = await import("../lib/fetch-x-via-chrome-mcp.js");
    const accounts = await fetchXViaChromeMcp({
      builders: [{ name: "Injected User", handle: "injected" }],
      date: "2026-03-28",
      dataDir,
      client: injectedClient,
    });

    assert.equal(accounts.length, 1);
    assert.deepEqual(injectedCalls, [
      "assertAvailable",
      "chrome_navigate",
      "chrome_javascript",
    ]);
    assert.equal(globalThis.__fakeBridgeState.closed, 0);
  } finally {
    if (originalRoot == null) {
      delete process.env.MCP_CHROME_BRIDGE_ROOT;
    } else {
      process.env.MCP_CHROME_BRIDGE_ROOT = originalRoot;
    }

    delete globalThis.__fakeBridgeState;
    await rm(tmpRoot, { recursive: true, force: true });
    await rm(dataDir, { recursive: true, force: true });
  }
});

test("fetchXViaChromeMcp uses GMT+8 day boundaries when filtering tweets", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "fetch-x-window-"));
  const calls = [];
  const injectedClient = {
    async assertAvailable() {},
    async callJsonTool(tool, payload) {
      calls.push({ tool, payload });

      if (tool === "chrome_javascript") {
        return {
          success: true,
          result: {
            bio: "Injected client bio",
            avatarUrl: "",
            tweets: [],
          },
        };
      }

      return { success: true };
    },
    async close() {},
  };

  try {
    const { fetchXViaChromeMcp } = await import("../lib/fetch-x-via-chrome-mcp.js");

    await fetchXViaChromeMcp({
      builders: [{ name: "Injected User", handle: "injected" }],
      date: "2026-03-29",
      dataDir,
      client: injectedClient,
    });

    const scriptCall = calls.find((entry) => entry.tool === "chrome_javascript");
    assert.ok(scriptCall, "expected chrome_javascript to be called");
    assert.match(scriptCall.payload.code, /2026-03-28T16:00:00\.000Z/);
    assert.match(scriptCall.payload.code, /2026-03-29T16:00:00\.000Z/);
  } finally {
    await rm(dataDir, { recursive: true, force: true });
  }
});
