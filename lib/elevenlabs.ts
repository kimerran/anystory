import ky from "ky";

export async function generateAudio(text: string, voiceId: string): Promise<Buffer> {
  try {
    const res = await ky.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY! },
        searchParams: { output_format: "mp3_44100_128" },
        json: {
          text,
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.6,
            similarity_boost: 0.85,
            style: 0.3,
            use_speaker_boost: true,
          },
        },
      }
    );
    return Buffer.from(await res.arrayBuffer());
  } catch {
    throw new Error("ElevenLabs: audio generation failed");
  }
}
