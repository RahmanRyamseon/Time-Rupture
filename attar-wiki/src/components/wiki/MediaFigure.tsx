import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { EntityType, MediaItem } from "@/lib/types";

const LICENSE_LABEL: Record<string, string> = {
  "CC0-1.0": "CC0",
  "CC-BY-4.0": "CC BY 4.0",
  "CC-BY-SA-4.0": "CC BY-SA 4.0",
  "OWN-WORK-CC-BY-SA-4.0": "CC BY-SA 4.0 (own work)",
  "BRAND-PERMISSION": "Used with permission",
};

export function mediaUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${path}`;
}

/** Licensed image with visible credit, or a placeholder illustration. */
export async function MediaFigure({ media, type, alt }: { media: MediaItem | undefined; type: EntityType; alt: string }) {
  const t = await getTranslations("wiki");
  if (!media) {
    return (
      <figure className="overflow-hidden rounded-xl border border-line bg-sand">
        <Placeholder type={type} label={alt} />
        <figcaption className="px-3 py-2 text-xs text-muted">{t("noImage")}</figcaption>
      </figure>
    );
  }
  return (
    <figure className="overflow-hidden rounded-xl border border-line bg-white">
      <Image
        src={mediaUrl(media.storage_path)}
        alt={media.alt}
        width={media.width ?? 800}
        height={media.height ?? 800}
        sizes="(min-width: 1024px) 320px, 100vw"
        className="h-auto w-full object-cover"
        priority
      />
      <figcaption className="px-3 py-2 text-xs text-muted">
        {media.source_url ? (
          <a href={media.source_url} rel="nofollow noopener" target="_blank" className="text-muted">
            {t("imageCredit", { credit: media.credit, license: LICENSE_LABEL[media.license] ?? media.license })}
          </a>
        ) : (
          t("imageCredit", { credit: media.credit, license: LICENSE_LABEL[media.license] ?? media.license })
        )}
      </figcaption>
    </figure>
  );
}

/** Decorative SVG illustrations (original artwork, no external assets). */
export function Placeholder({ type, label }: { type: EntityType; label: string }) {
  const motif: Record<EntityType, React.ReactNode> = {
    attar: (
      <g fill="none" stroke="#8a4b12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M100 38c-7 10-7 17 0 24 7-7 7-14 0-24z" fill="#c9a24a" stroke="#c9a24a" />
        <path d="M88 70h24M92 70v14c-22 8-36 26-36 47 0 26 20 44 44 44s44-18 44-44c0-21-14-39-36-47V70" />
        <path d="M70 136c9 6 20 9 30 9s21-3 30-9" opacity=".6" />
      </g>
    ),
    house: (
      <g fill="none" stroke="#8a4b12" strokeWidth="3" strokeLinejoin="round">
        <path d="M50 170V95l50-35 50 35v75z" />
        <path d="M85 170v-40a15 15 0 0 1 30 0v40" />
        <path d="M100 30v18" stroke="#c9a24a" />
      </g>
    ),
    note: (
      <g fill="none" stroke="#8a4b12" strokeWidth="3" strokeLinecap="round">
        <path d="M100 175V80" />
        <path d="M100 120c-30-5-45-25-45-50 25 0 45 20 45 50zM100 105c25-5 40-22 40-45-22 0-40 18-40 45z" />
        <circle cx="100" cy="62" r="14" fill="#c9a24a" stroke="#c9a24a" />
      </g>
    ),
    region: (
      <g fill="none" stroke="#8a4b12" strokeWidth="3" strokeLinejoin="round">
        <path d="M40 160c30-10 40-60 70-70s40 30 50 70" />
        <path d="M30 170h140" />
        <circle cx="140" cy="60" r="14" fill="#c9a24a" stroke="#c9a24a" />
      </g>
    ),
    glossary: (
      <g fill="none" stroke="#8a4b12" strokeWidth="3" strokeLinejoin="round">
        <path d="M45 55h50a10 10 0 0 1 10 10v105a10 10 0 0 0-10-10H45zM155 55h-50v115" />
        <path d="M60 80h30M60 100h30M120 80h20M120 100h20" stroke="#c9a24a" />
      </g>
    ),
    guide: (
      <g fill="none" stroke="#8a4b12" strokeWidth="3" strokeLinejoin="round">
        <path d="M55 40h75l20 20v115H55z" />
        <path d="M75 85h55M75 105h55M75 125h40" stroke="#c9a24a" />
      </g>
    ),
  };
  return (
    <svg viewBox="0 0 200 200" role="img" aria-label={label} className="aspect-square w-full">
      <rect width="200" height="200" fill="#f3e9d8" />
      <circle cx="100" cy="110" r="78" fill="#fbf6ee" />
      {motif[type]}
    </svg>
  );
}
