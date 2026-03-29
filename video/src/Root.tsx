import { Composition } from "remotion";
import { VideoComposition } from "./VideoComposition";
import type { CompositionProps } from "./types";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="VideoComposition"
      component={VideoComposition}
      durationInFrames={300}
      fps={30}
      width={1170}
      height={2532}
      defaultProps={{
        segments: [],
        date: "2026-03-27",
        stats: { builders: 0, podcasts: 0, blogs: 0 },
        builderNames: [],
      } satisfies CompositionProps}
      calculateMetadata={({ props }) => {
        const totalFrames = props.segments.reduce(
          (sum, segment) => sum + segment.durationInFrames,
          0,
        );

        return {
          durationInFrames: totalFrames > 0 ? totalFrames : 300,
        };
      }}
    />
  );
};
