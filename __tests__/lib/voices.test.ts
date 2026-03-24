import { describe, it, expect } from "vitest";
import { VOICES, getVoiceById } from "@/lib/voices";

describe("VOICES", () => {
  it("has 8 voices", () => {
    expect(VOICES).toHaveLength(8);
  });

  it("each voice has id, name, description", () => {
    for (const v of VOICES) {
      expect(v.id).toBeTruthy();
      expect(v.name).toBeTruthy();
      expect(v.description).toBeTruthy();
    }
  });
});

describe("getVoiceById", () => {
  it("returns the matching voice", () => {
    const voice = getVoiceById("21m00Tcm4TlvDq8ikWAM");
    expect(voice?.name).toBe("Rachel");
  });

  it("returns undefined for unknown id", () => {
    expect(getVoiceById("unknown")).toBeUndefined();
  });
});
