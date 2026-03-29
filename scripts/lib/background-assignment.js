import { basename } from "path";

export function assignSegmentBackgrounds(segments, assets) {
  if (!Array.isArray(assets) || assets.length === 0) return segments;

  let nonTweetIndex = 0;
  let tweetIndex = 0;

  return segments.map((segment) => {
    if (segment.type === "tweet") {
      if (!segment.backgroundAsset || segment.backdropAsset) return segment;

      const asset = assets[tweetIndex % assets.length];
      tweetIndex += 1;
      if (!asset) return segment;

      return {
        ...segment,
        backdropAsset: `backgrounds/${basename(asset)}`,
      };
    }

    if (segment.backgroundAsset) return segment;

    const asset = assets[nonTweetIndex % assets.length];
    nonTweetIndex += 1;
    if (!asset) return segment;

    return {
      ...segment,
      backgroundAsset: `backgrounds/${basename(asset)}`,
    };
  });
}
