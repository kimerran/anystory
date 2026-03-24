import ky from "ky";

export async function scrapeUrl(url: string): Promise<{ markdown: string }> {
  const res = await ky
    .post("https://api.firecrawl.dev/v1/scrape", {
      headers: { Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}` },
      json: { url, formats: ["markdown"], onlyMainContent: true, timeout: 30000 },
    })
    .json<{ success: boolean; data?: { markdown?: string } }>();

  const markdown = res.data?.markdown;
  if (!markdown) throw new Error("Firecrawl: failed to scrape URL");

  return { markdown: markdown.slice(0, 4000) };
}
