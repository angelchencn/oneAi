# Tweet Screenshot Tab Reuse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reuse a single Chrome working tab for tweet screenshots, close it after capture, and keep screenshot/background output deterministic.

**Architecture:** Extend the Chrome MCP wrapper with explicit lifecycle helpers, refactor tweet screenshot capture to use one managed work tab across selected tweets, and add tests around the managed flow and cleanup behavior. Keep screenshot generation serial and preserve existing background mapping behavior.

**Tech Stack:** Node.js ES modules, node:test, mcp-chrome-bridge, local Chrome MCP server

---

### Task 1: Add managed tab workflow tests

**Files:**
- Modify: `scripts/tests/tweet-screenshots.test.js`
- [ ] Add a failing test for reusing one managed tab across multiple tweet screenshots.
- [ ] Add a failing test for closing the managed tab when capture completes or fails.

### Task 2: Add Chrome MCP lifecycle helpers

**Files:**
- Modify: `scripts/lib/chrome-mcp-client.js`
- [ ] Add client close/disconnect support so each screenshot run releases the MCP transport.
- [ ] Add thin helper methods for JSON tool calls used by managed tab workflows.

### Task 3: Refactor screenshot capture to one working tab

**Files:**
- Modify: `scripts/lib/tweet-screenshots.js`
- [ ] Resolve or create one work tab, navigate it for each selected tweet, capture the tweet card screenshot, and close only that work tab at the end.
- [ ] Surface per-segment errors with logs instead of silently swallowing them.

### Task 4: Verify behavior

**Files:**
- Modify: `scripts/tests/tweet-screenshots.test.js`
- [ ] Run targeted screenshot tests and syntax checks.
- [ ] If local MCP is available, run one screenshot capture verification and then rerun the video pipeline path.
