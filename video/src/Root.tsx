import { Composition } from "remotion";
import { PitchVideo } from "./PitchVideo";

export function Root() {
  return (
    <Composition
      id="PitchVideo"
      component={PitchVideo}
      durationInFrames={1050}
      fps={30}
      width={1920}
      height={1080}
    />
  );
}
