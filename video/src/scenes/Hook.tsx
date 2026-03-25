import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";

export function Hook() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const wordGroups = ["What if", "any website", "could become", "a bedtime story?"];
  const wordDuration = fps * 1.3;

  return (
    <div style={{
      width: "100%", height: "100%",
      background: "#0a0a0f",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
      position: "relative", overflow: "hidden",
    }}>
      {/* Ambient glow */}
      <div style={{
        position: "absolute",
        width: 600, height: 600,
        background: "radial-gradient(circle, rgba(251,191,36,0.12) 0%, transparent 70%)",
        borderRadius: "50%",
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
      }} />

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, zIndex: 1 }}>
        {wordGroups.map((group, i) => {
          const startFrame = i * wordDuration * 0.7;
          const opacity = interpolate(frame, [startFrame, startFrame + 12], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });
          const y = interpolate(frame, [startFrame, startFrame + 18], [24, 0], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });
          const isHighlight = group === "a bedtime story?";
          return (
            <div key={i} style={{
              opacity,
              transform: `translateY(${y}px)`,
              fontSize: i === 0 ? 52 : 72,
              fontWeight: 900,
              letterSpacing: "-1px",
              color: isHighlight ? "#fbbf24" : "#ffffff",
              textShadow: isHighlight ? "0 0 40px rgba(251,191,36,0.5)" : "none",
              lineHeight: 1.1,
            }}>
              {group}
            </div>
          );
        })}
      </div>

      {/* Book emoji */}
      {(() => {
        const emojiStart = wordDuration * 2.5;
        const opacity = interpolate(frame, [emojiStart, emojiStart + 10], [0, 1], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
        });
        return (
          <div style={{
            position: "absolute", bottom: 80,
            fontSize: 48, opacity,
          }}>
            📖
          </div>
        );
      })()}
    </div>
  );
}
