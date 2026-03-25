import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const VOICE_ID = "AZnzlk1XvdvUeBnXmlld"; // Domi — energetic, playful

const SCRIPT =
  "What if any website could become a bedtime story? " +
  "Paste a URL, pick a voice, hit generate — " +
  "and in seconds you get an illustrated, narrated story. " +
  "Powered by Firecrawl, Claude, ElevenLabs, and fal dot ai. " +
  "AnyStory. Try it now.";

async function main() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set");

  console.log("Generating narration with Domi voice...");

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: SCRIPT,
        model_id: "eleven_turbo_v2_5",
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.85,
          style: 0.5,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`ElevenLabs error: ${res.status} ${await res.text()}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const outPath = join(__dirname, "../public/narration.mp3");
  writeFileSync(outPath, buffer);
  console.log(`Narration saved to ${outPath}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
