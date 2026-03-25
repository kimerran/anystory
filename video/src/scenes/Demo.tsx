import { useCurrentFrame, useVideoConfig, interpolate, Easing, staticFile } from "remotion";

// Timed to match Domi's delivery of "Paste a URL, pick a voice, hit generate"
// across the ~3.9s scene window
const beats = [
  { text: "Paste a URL.", start: 0 },
  { text: "Pick a voice.", start: 1.4 },
  { text: "Hit generate.", start: 2.7 },
];

export function Demo() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const imgOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const imgScale = interpolate(frame, [0, 20], [1.04, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <div style={{
      width: "100%", height: "100%",
      background: "#0a0a0f",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
      position: "relative", overflow: "hidden",
    }}>
      {/* Screenshot */}
      <div style={{
        position: "absolute", inset: 0,
        opacity: imgOpacity,
        transform: `scale(${imgScale})`,
      }}>
        <img
          src={staticFile("homepage.png")}
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
        />
        {/* Dark overlay so text pops */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to bottom, rgba(10,10,15,0.3) 0%, rgba(10,10,15,0.7) 100%)",
        }} />
      </div>

      {/* Beat text */}
      <div style={{
        position: "absolute", bottom: 120,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
        zIndex: 2,
      }}>
        {beats.map(({ text, start }, i) => {
          const startFrame = start * fps;
          const opacity = interpolate(frame, [startFrame, startFrame + 8], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          const x = interpolate(frame, [startFrame, startFrame + 12], [-30, 0], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
            easing: Easing.out(Easing.back(1.2)),
          });
          return (
            <div key={i} style={{
              opacity,
              transform: `translateX(${x}px)`,
              fontSize: 56,
              fontWeight: 900,
              color: i === 2 ? "#fbbf24" : "#ffffff",
              letterSpacing: "-0.5px",
              textShadow: "0 2px 20px rgba(0,0,0,0.8)",
            }}>
              {text}
            </div>
          );
        })}
      </div>
    </div>
  );
}
