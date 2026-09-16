import { PROBLEMS } from "@/data/problems";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";

export const dynamic = "force-static";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const items = [...PROBLEMS]
    .sort((a, b) => b.lastVerified.localeCompare(a.lastVerified))
    .map((entry) => {
      const url = `${SITE_URL}/problem/${entry.slug}/`;
      const pubDate = new Date(`${entry.lastVerified}T00:00:00Z`).toUTCString();
      return `  <item>
    <title>${escapeXml(entry.title)}</title>
    <link>${url}</link>
    <guid isPermaLink="true">${url}</guid>
    <description>${escapeXml(entry.short)}</description>
    <pubDate>${pubDate}</pubDate>
  </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>${escapeXml(SITE_NAME)}</title>
  <link>${SITE_URL}/</link>
  <description>${escapeXml(SITE_DESCRIPTION)}</description>
  <language>en</language>
${items}
</channel>
</rss>
`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
