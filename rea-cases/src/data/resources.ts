import type { ResourceSection } from "@/lib/types";

/**
 * Link collections from the upstream list that aren't themselves cases:
 * REA's own channels, peer MCP tools, the other lists tracking this wave,
 * and the press/discussion trail. Kept separate from CASES because none of
 * these carry an evidence tag — there is no claim to check.
 */
export const RESOURCE_SECTIONS: ResourceSection[] = [
  {
    slug: "official",
    title: "Official resources",
    intro:
      "REA's own channels. If you are installing it, start here rather than with a mirror — see the warning about fake downloads on the Legal page.",
    links: [
      {
        title: "morluto/rea",
        url: "https://github.com/morluto/rea",
        description:
          "The REA repository, MIT licensed. `npx rea-agents setup` registers it with your agent.",
      },
      {
        title: "rea.tools",
        url: "https://rea.tools/",
        description: "The website, with illustrated guides, case studies and a blog.",
      },
      {
        title: "rea-agents on npm",
        url: "https://www.npmjs.com/package/rea-agents",
        description: "The published CLI and MCP server.",
      },
      {
        title: "The REA skill on skills.sh",
        url: "https://skills.sh/morluto/rea/reverse-engineer-anything",
        description: "An agent skill with the investigation workflow instructions only.",
      },
      {
        title: "The Chinese README",
        url: "https://github.com/morluto/rea/blob/main/docs/readme/README_zh.md",
        description: "The official Simplified Chinese documentation.",
        language: "🇨🇳",
      },
      {
        title: "How the MCP tool catalog is generated",
        url: "https://github.com/morluto/rea/blob/main/docs/mcp-contracts.md#generated-catalog",
        description:
          "How the full list of tools, providers and CLI commands is produced. The generated output is not committed.",
      },
      {
        title: "morluto/awesome-reverse-engineering",
        url: "https://github.com/morluto/awesome-reverse-engineering",
        description:
          "A general reverse-engineering tools and learning list, maintained by REA's own author. CC0-1.0.",
      },
      {
        title: "The Discord community",
        url: "https://discord.gg/GkcryMnJDM",
        description: "Official Q&A and Show and Tell.",
      },
    ],
  },
  {
    slug: "guides",
    title: "Guides and write-ups",
    intro:
      "Introductions and tutorials that aren't repositories. The hands-on labs and benchmarks are indexed as cases under Guides & research.",
    links: [
      {
        title: "REA: Reverse Engineer Anything with AI Agents & MCP (HoangYell)",
        url: "https://hoangyell.com/rea-explained/",
        description: "Introduction.",
      },
      {
        title: "Reverse Engineer Anything: What the Viral REA MCP Actually Does (MindStudio)",
        url: "https://www.mindstudio.ai/blog/reverse-engineer-anything-mcp",
        description: "What REA does, without the hype.",
      },
      {
        title: "Agentic Reverse Engineering: What REA Is and How to Start (El Solitario)",
        url: "https://elsolitario.org/en/2026/10/10/rea-reverse-engineering-for-coding-agents/",
        description: "Getting started.",
      },
      {
        title: "How To Use REA To Clone Any Software In Minutes (Eric Tech, YouTube)",
        url: "https://www.youtube.com/watch?v=FnB9tHKBJXQ",
        description: "Video tutorial.",
      },
    ],
  },
  {
    slug: "related-tools",
    title: "Related MCP reverse-engineering tools",
    intro: "Tools that REA drives, or tools in the same category.",
    links: [
      {
        title: "mrexodia/ida-pro-mcp",
        url: "https://github.com/mrexodia/ida-pro-mcp",
        description:
          "MCP server for IDA Pro, used by REA's IDA Pro profile. Its author now recommends the official HexRaysSA/ida-mcp.",
      },
      {
        title: "0xshlomil/ida-free-mcp",
        url: "https://github.com/0xshlomil/ida-free-mcp",
        description: "Native bridge for IDA Free, used by REA (see docs/ida-provider.md).",
      },
      {
        title: "LaurieWired/GhidraMCP",
        url: "https://github.com/LaurieWired/GhidraMCP",
        description:
          "MCP server for Ghidra. REA calls Ghidra's analyzeHeadless directly, so this is a peer tool, not a dependency.",
      },
      {
        title: "N0zoM1z0/touhou-reverse-engineering",
        url: "https://github.com/N0zoM1z0/touhou-reverse-engineering",
        description:
          "Evidence-first IDA + Codex notes, including runtime patch experiments. No REA mention.",
      },
    ],
  },
  {
    slug: "other-lists",
    title: "Other lists tracking this wave",
    intro:
      "This site mirrors one list. Several others track the same wave with different inclusion rules — worth cross-checking before you trust a single entry.",
    links: [
      {
        title: "sqwu/rea-gems",
        url: "https://github.com/sqwu/rea-gems",
        description:
          "Daily-updated gallery of REA cases, built from official pages, GitHub, HN and Reddit. Includes some mirror clones; check before use.",
      },
      {
        title: "miles990/rea-case-rankings",
        url: "https://github.com/miles990/rea-case-rankings",
        description:
          "Daily scored ranking of REA cases with JSON, RSS and llms.txt (formerly rea-awesome).",
      },
      {
        title: "kaixinbaba/awesome-rea",
        url: "https://github.com/kaixinbaba/awesome-rea",
        description:
          "Catalog of reverse-engineering, reimplementation and compatible alternatives (awesomerea.com). REA is not required.",
      },
      {
        title: "zhuyansen/awesome-ai-reverse-engineering",
        url: "https://github.com/zhuyansen/awesome-ai-reverse-engineering",
        description: "AI reverse-engineering tools, each with a security rating. Bilingual.",
      },
      {
        title: "DiscoverBox/awesome-ai-reverse",
        url: "https://github.com/DiscoverBox/awesome-ai-reverse",
        description: "AI-assisted reverse-engineering tools across MCP, Skills, plugins and agents.",
        language: "🇨🇳",
      },
      {
        title: "songshikang0111/awesome-REA-cases",
        url: "https://github.com/songshikang0111/awesome-REA-cases",
        description:
          "Tracks REA and AI reverse-engineering cases several times a day. 627 cases as of 2026-10-20, each marked as confirmed-REA or not, with categories and a search index.",
      },
      {
        title: "Asymmetrical-1024/awsome-REA",
        url: "https://github.com/Asymmetrical-1024/awsome-REA",
        description: "REA case collection with post screenshots, evidence excerpts and verification limits.",
        language: "🇨🇳",
      },
      {
        title: "yibie/awesome-rea",
        url: "https://github.com/yibie/awesome-rea",
        description: "Only includes AI decompilation and porting cases with stated acceptance tests.",
      },
      {
        title: "heaven-hm/awesome-reverse-engineered-games",
        url: "https://github.com/heaven-hm/awesome-reverse-engineered-games",
        description: "AI-rebuilt games.",
      },
      {
        title: "SubmitGame/awesome-decomp-games",
        url: "https://github.com/SubmitGame/awesome-decomp-games",
        description: "Decompiled games, many playable in the browser. CC0-1.0.",
      },
      {
        title: "reacher-z/Awesome-REA",
        url: "https://github.com/reacher-z/Awesome-REA",
        description:
          "Bilingual catalogue of tools, reconstruction projects, case studies and research papers, with a searchable site and a separately labelled automated repository index. MIT.",
      },
      {
        title: "AIshihzong/awesome-reverse-engineer-anything",
        url: "https://github.com/AIshihzong/awesome-reverse-engineer-anything",
        description: "The list this site is built from. CC0-1.0.",
      },
    ],
  },
  {
    slug: "press",
    title: "Discussion and press",
    links: [
      {
        title: "Hacker News: Reverse engineer anything with agents, from app behavior down to native binaries",
        url: "https://news.ycombinator.com/item?id=50058850",
      },
      {
        title: "Show HN: A MCP for Agents to reverse engineer binary code",
        url: "https://news.ycombinator.com/item?id=48901763",
      },
      {
        title: "GitHub discussion: reducing token waste in REA workflows",
        url: "https://github.com/morluto/rea/discussions/1958",
      },
      {
        title: "GitHub discussion: install notes and pitfalls on Fedora-family Linux",
        url: "https://github.com/morluto/rea/discussions/1435",
      },
      {
        title: "GitHub discussion: Linux benchmarks (Node 22/24/26 startup and five local models)",
        url: "https://github.com/morluto/rea/discussions/1998",
      },
      {
        title: "An AI agent that reverse engineers any software just hit number one on GitHub",
        url: "https://startupfortune.com/an-ai-agent-that-reverse-engineers-any-software-just-hit-number-one-on-github/",
        description: "Startup Fortune",
      },
      {
        title: "REA Tool Connects Claude Code and Cursor to Ghidra and IDA Pro",
        url: "https://cybersecuritynews.com/reverse-engineer-anything-tool/",
        description: "Cybersecurity News",
      },
      {
        title: "New Open-Source REA Tool Lets AI Agents Reverse Engineer Software Without Source Code",
        url: "https://cyberpress.org/new-open-source-rea-tool/",
        description: "CyberPress",
      },
      {
        title: "Matthew Berman promotes REA, which lets coding agents inspect apps without source code",
        url: "https://runtimewire.com/article/matthew-berman-rea-ai-reverse-engineering",
        description: "RuntimeWire",
      },
      {
        title: "REA Reverse Engineering Tool: Can AI Clone Your App's Features?",
        url: "https://www.mayhemcode.com/2026/10/rea-reverse-engineering-tool-can-ai.html",
        description: "MayhemCode",
      },
    ],
  },
];

export function resourceSectionBySlug(slug: string): ResourceSection | undefined {
  return RESOURCE_SECTIONS.find((s) => s.slug === slug);
}
