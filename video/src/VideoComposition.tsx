import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import type { CompositionProps, SegmentWithAudio } from "./types";
import { Intro } from "./components/Intro";
import { Overview } from "./components/Overview";
import { TweetCard } from "./components/TweetCard";
import { PodcastCard } from "./components/PodcastCard";
import { BlogCard } from "./components/BlogCard";
import { Outro } from "./components/Outro";
import { Subtitle } from "./components/Subtitle";
import { VideoBg } from "./components/VideoBg";

function renderSegment(
  segment: SegmentWithAudio,
  date: string,
  builderNames: string[],
): React.ReactNode {
  const { type, display } = segment;

  switch (type) {
    case "intro":
      return <Intro date={date} />;
    case "overview":
      return (
        <Overview
          builderNames={builderNames}
        />
      );
    case "tweet":
      return <TweetCard title={display.title} />;
    case "podcast":
      return (
        <PodcastCard
          title={display.title}
          subtitle={display.subtitle}
          points={display.points}
        />
      );
    case "blog":
      return (
        <BlogCard
          title={display.title}
          subtitle={display.subtitle}
        />
      );
    case "outro":
      return <Outro />;
    default:
      return null;
  }
}

export const VideoComposition: React.FC<CompositionProps> = ({
  segments,
  date,
  builderNames,
}) => {
  const resolvedBuilderNames = builderNames ?? [];
  let cumulativeFrames = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      {segments.map((segment) => {
        const from = cumulativeFrames;
        cumulativeFrames += segment.durationInFrames;

        const content = (
          <>
            {renderSegment(segment, date, resolvedBuilderNames)}
            <Subtitle
              text={segment.text}
              durationInFrames={segment.durationInFrames}
            />
            {segment.audioFile ? <Audio src={staticFile(segment.audioFile)} /> : null}
          </>
        );

        return (
          <Sequence
            key={segment.id}
            from={from}
            durationInFrames={segment.durationInFrames}
          >
            {segment.backgroundAsset ? (
              <VideoBg
                src={segment.backgroundAsset}
                backdropSrc={
                  segment.type === "tweet"
                    ? segment.backdropAsset ?? segment.backgroundAsset
                    : undefined
                }
                durationInFrames={segment.durationInFrames}
                fit={
                  segment.type === "tweet"
                    ? "tweet"
                    : segment.type === "podcast" || segment.type === "blog"
                      ? "blur"
                      : "cover"
                }
              >
                {content}
              </VideoBg>
            ) : (
              <AbsoluteFill>{content}</AbsoluteFill>
            )}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
