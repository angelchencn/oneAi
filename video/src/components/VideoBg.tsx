import { AbsoluteFill, Img, OffthreadVideo, staticFile } from "remotion";

interface VideoBgProps {
  src: string;
  durationInFrames: number;
  children: React.ReactNode;
  fit?: "cover" | "contain" | "blur" | "tweet";
  backdropSrc?: string;
}

export const VideoBg: React.FC<VideoBgProps> = ({
  src,
  children,
  fit = "cover",
  backdropSrc,
}) => {
  const mediaSrc = staticFile(src);
  const backdropMediaSrc = staticFile(backdropSrc ?? src);
  const needsBlurBackdrop = fit === "contain" || fit === "blur" || fit === "tweet";
  const needsContainedForeground = fit === "contain" || fit === "tweet";

  const renderMedia = (resolvedSrc: string, style: React.CSSProperties) => {
    if (/\.(mp4|mov|webm|m4v)$/i.test(resolvedSrc)) {
      return (
        <OffthreadVideo
          src={resolvedSrc}
          style={style}
          muted
        />
      );
    }

    return <Img src={resolvedSrc} style={style} />;
  };

  return (
    <AbsoluteFill>
      <AbsoluteFill>
        {fit === "tweet"
          ? (
            <>
              {renderMedia(backdropMediaSrc, {
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: "blur(18px) saturate(1.12) brightness(0.72)",
                transform: "scale(1.08)",
              })}
              <AbsoluteFill
                style={{
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {renderMedia(backdropMediaSrc, {
                  width: "82%",
                  height: "82%",
                  objectFit: "contain",
                  opacity: 0.78,
                  filter: "blur(6px) saturate(1.24) brightness(1.08)",
                  transform: "translate(24%, -18%) scale(1.18)",
                })}
              </AbsoluteFill>
            </>
          )
          : needsBlurBackdrop
          ? renderMedia(backdropMediaSrc, {
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: fit === "blur"
                ? "blur(32px) brightness(0.32)"
                : "blur(28px) brightness(0.42)",
              transform: "scale(1.08)",
            })
          : renderMedia(mediaSrc, {
              width: "100%",
              height: "100%",
              objectFit: "cover",
            })}
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          backgroundColor: fit === "tweet"
            ? "rgba(4, 10, 18, 0.04)"
            : fit === "contain"
            ? "rgba(0, 0, 0, 0.24)"
            : fit === "blur"
              ? "rgba(0, 0, 0, 0.28)"
              : "rgba(0, 0, 0, 0.45)",
        }}
      />

      {needsContainedForeground ? (
        <AbsoluteFill
          style={{
            alignItems: "center",
            justifyContent: "center",
            padding: fit === "tweet" ? "140px 80px 260px" : 72,
          }}
        >
          {renderMedia(mediaSrc, {
            width: "100%",
            height: "100%",
            objectFit: "contain",
            borderRadius: 32,
            boxShadow: "0 32px 90px rgba(0, 0, 0, 0.38)",
          })}
        </AbsoluteFill>
      ) : null}

      <AbsoluteFill>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};
