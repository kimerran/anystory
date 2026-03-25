import { useVideoConfig, Audio, Sequence, staticFile, interpolate } from "remotion";
import { Hook } from "./scenes/Hook";
import { Demo } from "./scenes/Demo";
import { Payoff } from "./scenes/Payoff";
import { Stack } from "./scenes/Stack";
import { Outro } from "./scenes/Outro";

// Scene durations in seconds
const SCENES = {
  hook:    { start: 0,  duration: 6  },
  demo:    { start: 6,  duration: 8  },
  payoff:  { start: 14, duration: 12 },
  stack:   { start: 26, duration: 4  },
  outro:   { start: 30, duration: 5  },
};

export function PitchVideo() {
  const { fps } = useVideoConfig();
  const toFrames = (s: number) => Math.round(s * fps);

  return (
    <div style={{ width: "100%", height: "100%", background: "#0a0a0f" }}>
      {/* Narration audio */}
      <Audio src={staticFile("narration.mp3")} />

      <Sequence from={toFrames(SCENES.hook.start)}   durationInFrames={toFrames(SCENES.hook.duration)}>
        <Hook />
      </Sequence>

      <Sequence from={toFrames(SCENES.demo.start)}   durationInFrames={toFrames(SCENES.demo.duration)}>
        <Demo />
      </Sequence>

      <Sequence from={toFrames(SCENES.payoff.start)} durationInFrames={toFrames(SCENES.payoff.duration)}>
        <Payoff />
      </Sequence>

      <Sequence from={toFrames(SCENES.stack.start)}  durationInFrames={toFrames(SCENES.stack.duration)}>
        <Stack />
      </Sequence>

      <Sequence from={toFrames(SCENES.outro.start)}  durationInFrames={toFrames(SCENES.outro.duration)}>
        <Outro />
      </Sequence>
    </div>
  );
}
