import type { MostSharedCase, Study } from "@/lib/types";

/**
 * The only controlled tests of REA anyone has published, both by third
 * parties. Both are worth reading before deciding REA is a prerequisite:
 * neither found the gain the viral posts imply.
 */
export const STUDIES: Study[] = [
  {
    name: "rea-lab",
    url: "https://github.com/pablodiazjorge/rea-lab",
    scale: "5 preregistered studies, 482 runs with Claude Code",
    finding:
      "No study found a significant gain in solve rate with REA, and REA runs took about twice the time and cost.",
    caveats:
      "Windows with Ghidra. Study 2 favoured the no-REA arm (11 of 24 against 4 of 24) but the author labels it not significant (exact McNemar, p = 0.092).",
  },
  {
    name: "leanrea",
    url: "https://github.com/aicodeking/leanrea",
    scale: "36 runs against REA 6.5.0",
    finding:
      "A plain-CLI skill came close to REA's accuracy (74/75 against 75/75) with 38 % less wall time and 35 % less cost.",
    caveats: "Three reps per cell, one model, one machine; Ghidra, Hopper and JADX absent from both arms.",
  },
];

/**
 * The cases that actually spread, with the reach figures the upstream list
 * recorded. Likes come from songshikang0111/awesome-REA-cases as of
 * 2026-10-12; view counts are as noted per row. Treat all of them as a
 * snapshot, not a live number.
 */
export const MOST_SHARED: MostSharedCase[] = [
  {
    title: "Universal Modder",
    url: "https://github.com/rehan-remade/universal-modder",
    author: "@rehan_shei",
    what: "Minecraft content inside GTA V and other games you own",
    reach: "14k likes",
    tag: "AI-RE",
  },
  {
    title: "Steam game to Unity in 30 min",
    url: "https://x.com/AIWarper/status/2109060856466264566",
    author: "@AIWarper",
    what: "Decompiled a game he owns to C#, using Opus 5.5",
    reach: "467k views",
    tag: "REA (author's post)",
  },
  {
    title: "Claude Slides editor",
    url: "https://x.com/dotey/status/2109151666020794711",
    author: "@dotey",
    what: "Deobfuscated the web front end, then rewrote it as baocut (source-available)",
    reach: "686 likes, 81k views (2026-10-12)",
    tag: "REA (author's post)",
  },
  {
    title: "Native Plex client for LG TVs",
    url: "https://github.com/GLinnik21/plx-native",
    author: "GLinnik21",
    what: "Startup and selection screen faster on an LG TV",
    reach: "7.3k likes (repost)",
    tag: "AI-RE",
  },
  {
    title: "Apple TV remote on Linux",
    url: "https://github.com/a-funk/open-appleremote",
    author: "@alexzfunk",
    what: "Bluetooth protocol of the first-gen remote, open source",
    reach: "5.4k likes",
    tag: "Claim?",
  },
  {
    title: "DX-Ball",
    url: "https://github.com/N0zoM1z0/dx-ball",
    author: "N0zoM1z0",
    what: "Byte-exact reconstruction of one sound-pan function, checked against 3,205 original x86 cases",
    reach: "official showcase",
    tag: "REA",
  },
];

/** The legal and controversy points the upstream list asks readers to keep in mind. */
export const LEGAL_POINTS: { title: string; body: string }[] = [
  {
    title: "Clean-room claims",
    body: "Critics note that one agent doing both the analysis and the rebuild does not meet the personnel separation of traditional clean-room development.",
  },
  {
    title: "Scope",
    body: "The official project does not claim to recover original source code or clone a whole application. DX-Ball's 3,205 / 63 figures apply to one function.",
  },
  {
    title: "Privacy and trust",
    body: "Analysis runs locally, but tool results pass through the agent to the model provider. REA's SECURITY.md says it is not a sandbox.",
  },
  {
    title: "Commercial tools",
    body: "IDA Pro, Hopper and JEB must be legally licensed. REA provides no licenses.",
  },
  {
    title: "Service terms",
    body: "Anthropic's and OpenAI's terms prohibit reverse-engineering their own services. They do not cover other software, but cases targeting Claude Slides, Claude Code, Claude Chrome or Codex's browser feature should be checked against those terms yourself.",
  },
  {
    title: "Official position",
    body: "REA's DISCLAIMER.md lists permitted uses: learning, research, interoperability, preservation, security research, vulnerability disclosure, and CTFs. It excludes copying proprietary software or reproducing its protected code and assets.",
  },
];
