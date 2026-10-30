import Link from "next/link";

/** The one thing every page should carry: this is not permission to do it. */
export function LegalNotice({ className = "" }: { className?: string }) {
  return (
    <aside
      className={`rounded-2xl border border-danger/30 bg-danger-soft p-4 text-sm text-foreground/80 ${className}`}
      role="note"
    >
      <p>
        <strong>⚠️ Reverse engineering is governed by local law, software licenses and terms of
        service.</strong>{" "}
        This index covers public information only, for learning, research, interoperability and
        preservation. Make sure you are allowed to analyse the target before you start —{" "}
        <Link href="/legal" className="underline hover:text-foreground">
          the full legal notes are here
        </Link>
        .
      </p>
    </aside>
  );
}
