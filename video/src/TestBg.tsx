import { AbsoluteFill, OffthreadVideo, staticFile, Composition } from "remotion";

export const TestBg: React.FC = () => {
  return (
    <AbsoluteFill>
      <OffthreadVideo
        src={staticFile("kling/intro.mp4")}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
        muted
      />
    </AbsoluteFill>
  );
};
