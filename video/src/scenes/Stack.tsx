import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";

const STACK = [
  { name: "Firecrawl", color: "#ef4444", emoji: "🔥" },
  { name: "Claude",    color: "#f97316", emoji: "🧠" },
  { name: "ElevenLabs",color: "#fbbf24", emoji: "🎙️" },
  { name: "fal.ai",   color: "#a78bfa", emoji: "🎨" },
];

export function Stack() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div style={{
      width: "100%", height: "100%",
      background: "#0a0a0f",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
      gap: 32,
    }}>
      <div style={{
        fontSize: 36,
        fontWeight: 700,
        color: "#ffffff88",
        letterSpacing: "3px",
        textTransform: "uppercase",
        opacity: interpolate(frame, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
      }}>
        Powered by
      </div>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center" }}>
        {STACK.map(({ name, color, emoji }, i) => {
          const startFrame = i * (fps * 0.55);
          const opacity = interpolate(frame, [startFrame, startFrame + 10], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          const y = interpolate(frame, [startFrame, startFrame + 16], [30, 0], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
            easing: Easing.out(Easing.back(1.8)),
          });
          return (
            <div key={name} style={{
              opacity,
              transform: `translateY(${y}px)`,
              display: "flex", alignItems: "center", gap: 12,
              background: `${color}18`,
              border: `2px solid ${color}55`,
              borderRadius: 16,
              padding: "16px 28px",
            }}>
              <span style={{ fontSize: 32 }}>{emoji}</span>
              <span style={{ fontSize: 32, fontWeight: 800, color, letterSpacing: "-0.5px" }}>{name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
