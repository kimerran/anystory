import ky from "ky";

export async function searchUrl(query: string): Promise<string | null> {
  const res = await ky
    .post("https://api.firecrawl.dev/v1/search", {
      headers: { Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}` },
      json: { query, limit: 3 },
      timeout: 15000,
    })
    .json<{ success: boolean; data?: Array<{ url: string }> }>();

  return res.data?.[0]?.url ?? null;
}

export async function scrapeUrl(url: string): Promise<{ markdown: string }> {
  const res = await ky
    .post("https://api.firecrawl.dev/v1/scrape", {
      headers: { Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}` },
      json: { url, formats: ["markdown"], onlyMainContent: true, timeout: 30000 },
      timeout: 60000,
    })
    .json<{ success: boolean; data?: { markdown?: string } }>();

  const markdown = res.data?.markdown;
  if (!markdown) throw new Error("Firecrawl: failed to scrape URL");

  return { markdown: markdown.slice(0, 4000) };
}
