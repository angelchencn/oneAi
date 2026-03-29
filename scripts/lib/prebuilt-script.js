export function hasReusablePrebuiltAudio(segments, audioFileExists) {
  return Array.isArray(segments) &&
    segments.length > 0 &&
    segments.every((segment) =>
      Boolean(segment?.audioFile) &&
      audioFileExists(segment.audioFile) &&
      Number.isFinite(segment?.durationInSeconds) &&
      Number.isFinite(segment?.durationInFrames),
    );
}
