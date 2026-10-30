import { UPSTREAM } from "@/lib/site";

/**
 * Where the data came from and when. Shown on data-bearing pages because
 * every figure in this index is a snapshot — the projects it tracks move
 * weekly, and a star count or a status from two weeks ago is a guess.
 */
export function UpstreamNote({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs leading-relaxed text-foreground/55 ${className}`}>
      Data mirrored from the CC0 list{" "}
      <a
        href={UPSTREAM.url}
        className="underline hover:text-foreground/80"
        rel="noopener noreferrer"
        target="_blank"
      >
        {UPSTREAM.name}
      </a>{" "}
      at commit <code className="font-mono">{UPSTREAM.commit.slice(0, 7)}</code>, snapshot{" "}
      {UPSTREAM.snapshot}. Links and figures were last checked upstream on {UPSTREAM.figuresChecked};
      the per-case REA claim check ran on {UPSTREAM.claimsChecked}. This site is unofficial and not
      affiliated with morluto/rea.
    </p>
  );
}
