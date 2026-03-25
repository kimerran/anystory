import { useCurrentFrame, useVideoConfig, interpolate, Easing, staticFile } from "remotion";

export function Payoff() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const imgScale = interpolate(frame, [0, fps * 4], [1, 1.06], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  const line1Opacity = interpolate(frame, [8, 20], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const line2Start = fps * 1.4;
  const line2Opacity = interpolate(frame, [line2Start, line2Start + 12], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const line2Scale = interpolate(frame, [line2Start, line2Start + 16], [0.85, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(1.5)),
  });

  return (
    <div style={{
      width: "100%", height: "100%",
      background: "#0a0a0f",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
      position: "relative", overflow: "hidden",
    }}>
      {/* Story page screenshot — Ken Burns zoom */}
      <div style={{
        position: "absolute", inset: 0,
        transform: `scale(${imgScale})`,
        transformOrigin: "center top",
      }}>
        <img
          src={staticFile("story-page.png")}
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
        />
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to bottom, rgba(10,10,15,0.1) 0%, rgba(10,10,15,0.75) 100%)",
        }} />
      </div>

      {/* Text overlay */}
      <div style={{
        position: "absolute", bottom: 100,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
        zIndex: 2,
      }}>
        <div style={{
          opacity: line1Opacity,
          fontSize: 52,
          fontWeight: 900,
          color: "#ffffff",
          letterSpacing: "-0.5px",
          textShadow: "0 2px 20px rgba(0,0,0,0.9)",
        }}>
          An illustrated, narrated story.
        </div>
        <div style={{
          opacity: line2Opacity,
          transform: `scale(${line2Scale})`,
          fontSize: 68,
          fontWeight: 900,
          color: "#fbbf24",
          letterSpacing: "-1px",
          textShadow: "0 0 40px rgba(251,191,36,0.6)",
        }}>
          In seconds.
        </div>
      </div>
    </div>
  );
}
