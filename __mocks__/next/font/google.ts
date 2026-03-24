// Mock for next/font/google — font functions cannot be called outside Next.js runtime
const makeFontMock = (variable: string) => () => ({
  className: `mock-font`,
  variable,
  style: { fontFamily: "sans-serif" },
});

export const Fredoka = makeFontMock("--font-fredoka");
export const Bubblegum_Sans = makeFontMock("--font-bubblegum");
export const Patrick_Hand = makeFontMock("--font-patrick");
export const Baloo_2 = makeFontMock("--font-baloo");
export const Schoolbell = makeFontMock("--font-schoolbell");
export const Short_Stack = makeFontMock("--font-shortstack");
export const Sniglet = makeFontMock("--font-sniglet");
export const Chewy = makeFontMock("--font-chewy");
