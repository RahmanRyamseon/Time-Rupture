import { PROBLEMS } from "@/data/problems";

export function DataDisclaimer({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs leading-relaxed text-foreground/55 ${className}`}>
      PF Wiki is an independent, unofficial reference — it is <strong>not affiliated with EPFO</strong> or
      the Government of India. Every one of its {PROBLEMS.length} entries is written from a research pass
      over published guidance and personal-finance sites (see each entry&apos;s Sources), plus fixes people
      report worked for them on forums and social media — not a live feed from EPFO&apos;s systems. Rules,
      forms, and processing times change; always confirm your specific case on the{" "}
      <a
        href="https://unifiedportal-mem.epfindia.gov.in/"
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:text-foreground/80"
      >
        official EPFO Member Portal
      </a>{" "}
      or with a regional EPFO office before acting.
    </p>
  );
}
