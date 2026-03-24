import {
  Fredoka,
  Bubblegum_Sans,
  Patrick_Hand,
  Baloo_2,
  Schoolbell,
  Short_Stack,
  Sniglet,
  Chewy,
} from "next/font/google";

export const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-fredoka",
  display: "swap",
});

export const bubblegumSans = Bubblegum_Sans({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-bubblegum",
  display: "swap",
});

export const patrickHand = Patrick_Hand({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-patrick",
  display: "swap",
});

export const baloo2 = Baloo_2({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-baloo",
  display: "swap",
});

export const schoolbell = Schoolbell({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-schoolbell",
  display: "swap",
});

export const shortStack = Short_Stack({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-shortstack",
  display: "swap",
});

export const sniglet = Sniglet({
  subsets: ["latin"],
  weight: ["400", "800"],
  variable: "--font-sniglet",
  display: "swap",
});

export const chewy = Chewy({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-chewy",
  display: "swap",
});

/** All font CSS variables for use in layout.tsx className */
export const allFontVars = [
  fredoka.variable,
  bubblegumSans.variable,
  patrickHand.variable,
  baloo2.variable,
  schoolbell.variable,
  shortStack.variable,
  sniglet.variable,
  chewy.variable,
].join(" ");

export interface StoryFont {
  name: string;
  variable: string;
  description: string;
  className: string;
}

export const STORY_FONTS: StoryFont[] = [
  { name: "Bubblegum Sans", variable: "--font-bubblegum", description: "Playful, bouncy", className: "font-bubblegum" },
  { name: "Patrick Hand",   variable: "--font-patrick",   description: "Handwritten, friendly", className: "font-patrick" },
  { name: "Fredoka",        variable: "--font-fredoka",   description: "Round, soft", className: "font-fredoka" },
  { name: "Baloo 2",        variable: "--font-baloo",     description: "Friendly, modern", className: "font-baloo" },
  { name: "Schoolbell",     variable: "--font-schoolbell",description: "Chalkboard feel", className: "font-schoolbell" },
  { name: "Short Stack",    variable: "--font-shortstack",description: "Comic-like", className: "font-shortstack" },
  { name: "Sniglet",        variable: "--font-sniglet",   description: "Soft, rounded", className: "font-sniglet" },
  { name: "Chewy",          variable: "--font-chewy",     description: "Bold, fun", className: "font-chewy" },
];
