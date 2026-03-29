import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../styles/theme";

interface CountUpProps {
  value: number;
  label: string;
  delay: number;
}

const CountUp: React.FC<CountUpProps> = ({ value, label, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: Math.max(0, frame - delay),
    fps,
    config: { damping: 15, stiffness: 80 },
  });

  const displayValue = Math.round(interpolate(progress, [0, 1], [0, value]));

  const opacity = interpolate(Math.max(0, frame - delay), [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        opacity,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: theme.spacing.gap / 2,
      }}
    >
      <div
        style={{
          color: theme.colors.accent,
          fontSize: theme.fontSize.stat,
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        {displayValue}
      </div>
      <div
        style={{
          color: theme.colors.textSecondary,
          fontSize: theme.fontSize.body,
          fontWeight: 400,
        }}
      >
        {label}
      </div>
    </div>
  );
};

interface OverviewProps {
  builderNames: string[];
}

export const Overview: React.FC<OverviewProps> = ({ builderNames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const builders = builderNames.length;

  const headerOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  const headerScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  return (
    <AbsoluteFill
      style={{
        background: "transparent",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        gap: theme.spacing.gap * 2,
        fontFamily: theme.fonts.primary,
        padding: `0 ${theme.spacing.page}px ${theme.spacing.page + 240}px`,
      }}
    >
      <div
        style={{
          opacity: headerOpacity,
          transform: `scale(${headerScale})`,
          color: theme.colors.text,
          fontSize: theme.fontSize.title,
          fontWeight: 700,
          textAlign: "center",
        }}
      >
        今日追踪
      </div>
      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <CountUp value={builders} label="构建者" delay={0} />
      </div>
      <div
        style={{
          width: "100%",
          maxWidth: 900,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          columnGap: theme.spacing.gap * 2,
          rowGap: theme.spacing.gap / 2,
        }}
      >
        {builderNames.map((name, index) => (
          <div
            key={`${name}-${index}`}
            style={{
              color: theme.colors.textSecondary,
              fontSize: 24,
              textAlign: "center",
              lineHeight: 1.3,
            }}
          >
            {name}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
