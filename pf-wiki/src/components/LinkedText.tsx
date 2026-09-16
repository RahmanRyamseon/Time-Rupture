import Link from "next/link";
import { parseLinkedText } from "@/lib/richText";

/** Renders a content string, turning any `[label](href)` spans into real Next.js links. */
export function LinkedText({ text }: { text: string }) {
  const tokens = parseLinkedText(text);
  return (
    <>
      {tokens.map((t, i) =>
        t.type === "link" ? (
          <Link
            key={i}
            href={t.href}
            className="font-medium text-brand-strong underline decoration-brand-strong/40 underline-offset-2 hover:decoration-brand-strong"
          >
            {t.label}
          </Link>
        ) : (
          <span key={i}>{t.value}</span>
        ),
      )}
    </>
  );
}
