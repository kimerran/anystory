import { useVideoConfig, Audio, Sequence, staticFile } from "remotion";
import { Hook } from "./scenes/Hook";
import { Demo } from "./scenes/Demo";
import { Payoff } from "./scenes/Payoff";
import { Stack } from "./scenes/Stack";
import { Outro } from "./scenes/Outro";

// Scene timing derived from actual ElevenLabs narration timestamps (18.53s total)
// Hook:   0-2.54s  "What if any website could become a bedtime story?"
// Demo:   2.54-6.51s "Paste a URL, pick a voice, hit generate"
// Payoff: 6.51-10.43s "and in seconds you get an illustrated, narrated story"
// Stack:  10.43-16.05s "Powered by Firecrawl, Claude, ElevenLabs, and fal dot ai"
// Outro:  16.05-19.5s "AnyStory. Try it now." + hold
const SCENES = {
  hook:    { start: 0,    duration: 2.8  },
  demo:    { start: 2.8,  duration: 3.9  },
  payoff:  { start: 6.7,  duration: 3.9  },
  stack:   { start: 10.6, duration: 5.7  },
  outro:   { start: 16.3, duration: 3.2  },
};

export function PitchVideo() {
  const { fps } = useVideoConfig();
  const toFrames = (s: number) => Math.round(s * fps);

  return (
    <div style={{ width: "100%", height: "100%", background: "#0a0a0f" }}>
      {/* Background music — very low volume */}
      <Audio src={staticFile("background.wav")} volume={0.07} />
      {/* Narration */}
      <Audio src={staticFile("narration.mp3")} volume={1} />

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
