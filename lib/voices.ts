export interface Voice {
  id: string;
  name: string;
  description: string;
}

export const VOICES: Voice[] = [
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel",  description: "Warm, calm storyteller" },
  { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi",    description: "Energetic, playful" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella",   description: "Soft, gentle" },
  { id: "ErXwobaYiN019PkySvjV", name: "Antoni",  description: "Friendly, expressive" },
  { id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli",    description: "Sweet, child-friendly" },
  { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh",    description: "Warm, fatherly narrator" },
  { id: "VR6AewLTigWG4xSOukaG", name: "Arnold",  description: "Deep, adventurous" },
  { id: "pNInz6obpgDQGcFmaJgB", name: "Adam",    description: "Clear, trustworthy" },
];

export function getVoiceById(id: string): Voice | undefined {
  return VOICES.find((v) => v.id === id);
}
