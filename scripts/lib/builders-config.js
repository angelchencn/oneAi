import { readFile } from "fs/promises";
import { join } from "path";

function normalizeBuilder(builder, index) {
  const name = String(builder?.name || "").trim();
  const handle = String(builder?.handle || "").trim().replace(/^@+/, "");

  if (!name || !handle) {
    throw new Error(
      `builders.json item ${index + 1} must include non-empty "name" and "handle" strings`,
    );
  }

  return { name, handle };
}

export async function loadBuildersConfig({
  rootDir,
  filePath = join(rootDir, "builders.json"),
} = {}) {
  const content = await readFile(filePath, "utf8");
  const parsed = JSON.parse(content);

  if (!Array.isArray(parsed)) {
    throw new Error("builders.json must contain a JSON array");
  }

  return parsed.map(normalizeBuilder);
}
