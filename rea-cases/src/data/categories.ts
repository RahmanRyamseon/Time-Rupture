import type { Category } from "@/lib/types";

export const CATEGORIES: Category[] = [
  {
    slug: "official-showcases",
    name: "Official showcases",
    icon: "🏛️",
    description:
      "The cases REA's own site documents — and what each one actually covers, which is usually narrower than the headline.",
  },
  {
    slug: "games",
    name: "Games & reconstructions",
    icon: "🎮",
    description:
      "Old games and engines rebuilt from their binaries, from single functions to whole engine reimplementations.",
  },
  {
    slug: "apps",
    name: "Apps & tools",
    icon: "🧰",
    description:
      "Desktop and web applications rebuilt or re-implemented after an agent studied the shipped product.",
  },
  {
    slug: "hardware",
    name: "Hardware, protocols & drivers",
    icon: "🔌",
    description:
      "Remotes, sound cards, TVs and peripherals — protocol work and Linux drivers recovered from firmware and captures.",
  },
  {
    slug: "security",
    name: "Security & evaluations",
    icon: "🛡️",
    description:
      "Binary analysis write-ups, ground-truth checks on REA's own output, sandboxing, and the defensive side.",
  },
  {
    slug: "plugins",
    name: "Plugins & integrations",
    icon: "🔗",
    description:
      "Adapters, Docker images, skills and ports that wire REA into a particular agent, editor or packaging system.",
  },
  {
    slug: "research",
    name: "Guides & research",
    icon: "📚",
    description:
      "Labs, benchmarks, prompt collections and language-specific guides — including the controlled tests of whether REA helps.",
  },
  {
    slug: "wider-wave",
    name: "The wider wave",
    icon: "🌊",
    description:
      "Projects that rode the same wave without evidence of REA: clean-room rewrites and other AI reverse-engineering work.",
  },
];

export function categoryBySlug(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}
