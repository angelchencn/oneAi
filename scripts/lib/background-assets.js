import { existsSync } from "fs";
import { join, resolve } from "path";

function normalizeBackgroundDir(rootDir, dir) {
  const trimmed = String(dir || "").trim();
  if (!trimmed) return null;
  return resolve(rootDir, trimmed);
}

export function resolveBackgroundDir({
  rootDir,
  cliBackgroundDir = null,
  envBackgroundDir = process.env.BACKGROUND_DIR || null,
} = {}) {
  const cliDir = normalizeBackgroundDir(rootDir, cliBackgroundDir);
  if (cliDir) return cliDir;

  const envDir = normalizeBackgroundDir(rootDir, envBackgroundDir);
  if (envDir) return envDir;

  const defaultDirs = [
    join(rootDir, "background"),
    join(rootDir, "backgrounds"),
  ];

  return defaultDirs.find((candidate) => existsSync(candidate)) || null;
}
