import { AbsoluteFill } from "remotion";
import { theme } from "../styles/theme";

interface TweetCardProps {
  title?: string;
}

export const TweetCard: React.FC<TweetCardProps> = ({ title }) => {
  if (!title) return null;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-start",
        padding: "88px 84px 0",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          alignSelf: "flex-start",
          maxWidth: 760,
          padding: "24px 30px 26px",
          borderRadius: 32,
          backgroundColor: "rgba(7, 14, 24, 0.52)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow: "0 18px 44px rgba(0, 0, 0, 0.22)",
          backdropFilter: "blur(18px)",
        }}
      >
        <div
          style={{
            color: theme.colors.text,
            fontFamily: theme.fonts.primary,
            fontSize: theme.fontSize.tweetName,
            fontWeight: 800,
            lineHeight: 1.04,
            letterSpacing: "-0.03em",
            textShadow: "0 4px 16px rgba(0, 0, 0, 0.2)",
          }}
        >
          {title}
        </div>
      </div>
    </AbsoluteFill>
  );
};
