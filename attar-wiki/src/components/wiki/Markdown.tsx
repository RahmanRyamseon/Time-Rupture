import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import GithubSlugger from "github-slugger";

/**
 * Server-rendered Markdown. Raw HTML in content is NOT rendered (react-markdown
 * escapes it by default), so contributor text cannot inject scripts.
 */
export function Markdown({ children, className = "prose-wiki" }: { children: string; className?: string }) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug]}
        components={{
          a: ({ href, children: c }) => {
            const external = href?.startsWith("http");
            return (
              <a href={href} {...(external ? { rel: "nofollow noopener", target: "_blank" } : {})}>
                {c}
              </a>
            );
          },
          img: () => null, // images only through the licensed media system
          h1: ({ children: c, id }) => <h2 id={id}>{c}</h2>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

/** Extract h2/h3 headings for a table of contents (ids match rehype-slug). */
export function markdownHeadings(md: string | null | undefined) {
  if (!md) return [];
  // github-slugger is what rehype-slug uses internally, so ids match.
  const slugger = new GithubSlugger();
  const out: { id: string; text: string; level: 2 | 3 }[] = [];
  let inFence = false;
  for (const line of md.split("\n")) {
    if (line.trim().startsWith("```")) inFence = !inFence;
    if (inFence) continue;
    const m = /^(#{1,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (m) {
      const text = m[2].replace(/[*_`[\]]/g, "");
      out.push({ id: slugger.slug(text), text, level: m[1].length === 3 ? 3 : 2 });
    }
  }
  return out;
}
