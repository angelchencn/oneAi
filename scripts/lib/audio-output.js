import { mkdir } from "fs/promises";
import { existsSync, statSync } from "fs";
import { dirname } from "path";

export async function ensureAudioOutputPath(outputPath) {
  await mkdir(dirname(outputPath), { recursive: true });
}

export function verifyAudioOutputFile(outputPath) {
  if (!existsSync(outputPath)) {
    throw new Error(`edge-tts did not create expected audio file: ${outputPath}`);
  }

  if (statSync(outputPath).size <= 0) {
    throw new Error(`edge-tts left an empty audio file: ${outputPath}`);
  }
}
