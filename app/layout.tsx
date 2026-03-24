import type { Metadata } from "next";
import { allFontVars } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "AnyStory — Turn any website into a bedtime story",
  description: "Paste any URL and get an illustrated, narrated children's story in seconds.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${allFontVars} font-fredoka antialiased`}>
        {children}
      </body>
    </html>
  );
}
