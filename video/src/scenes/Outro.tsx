import { useCurrentFrame, interpolate, Easing } from "remotion";

export function Outro() {
  const frame = useCurrentFrame();

  const logoOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const logoScale = interpolate(frame, [0, 20], [0.8, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(1.3)),
  });
  const subtitleOpacity = interpolate(frame, [20, 32], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <div style={{
      width: "100%", height: "100%",
      background: "#0a0a0f",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
      gap: 20,
      position: "relative", overflow: "hidden",
    }}>
      {/* Glow */}
      <div style={{
        position: "absolute",
        width: 700, height: 700,
        background: "radial-gradient(circle, rgba(251,191,36,0.15) 0%, transparent 65%)",
        borderRadius: "50%",
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
      }} />

      <div style={{
        opacity: logoOpacity,
        transform: `scale(${logoScale})`,
        display: "flex", alignItems: "center", gap: 20,
        zIndex: 1,
      }}>
        <span style={{ fontSize: 80 }}>📖</span>
        <span style={{
          fontSize: 96,
          fontWeight: 900,
          background: "linear-gradient(135deg, #fbbf24, #f97316)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          letterSpacing: "-2px",
        }}>
          AnyStory
        </span>
      </div>

      <div style={{
        opacity: subtitleOpacity,
        fontSize: 32,
        fontWeight: 600,
        color: "#ffffff66",
        letterSpacing: "1px",
        zIndex: 1,
      }}>
        Try it now →
      </div>
    </div>
  );
}
