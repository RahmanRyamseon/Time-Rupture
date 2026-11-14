import type { ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Icon } from "@/components/ui/Icon";
import { formatDate } from "@/lib/i18n-content";
import type { Section } from "@/lib/sections";
import type { EntityType } from "@/lib/types";
import { TableOfContents, type TocItem } from "./TableOfContents";
import { ViewBeacon } from "./ViewBeacon";

interface Props {
  section: Section;
  type: EntityType;
  id: string;
  slug: string;
  title: string;
  subtitle?: ReactNode;
  eyebrow: string;
  updatedAt: string;
  revisionCount: number;
  toc: TocItem[];
  aside?: ReactNode;
  englishOnly?: boolean;
  children: ReactNode;
}

export async function WikiShell(props: Props) {
  const t = await getTranslations();
  const locale = await getLocale();
  const base = `/${props.section}/${props.slug}`;

  return (
    <article className="container-wiki pt-6 md:pt-10" lang={props.englishOnly ? "en" : undefined}>
      <ViewBeacon type={props.type} id={props.id} />
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/" className="text-muted">
              {t("nav.home")}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={`/${props.section}`} className="text-muted">
              {t(`sections.${props.section}`)}
            </Link>
          </li>
        </ol>
      </nav>

      <header className="mt-4 border-b border-line pb-5">
        <p className="eyebrow">{props.eyebrow}</p>
        <h1 className="mt-1 text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">{props.title}</h1>
        {props.subtitle ? <div className="mt-2 text-lg text-muted">{props.subtitle}</div> : null}
        <hr className="gold-rule mt-4" />
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
          <span>{t("wiki.lastEdited", { date: formatDate(props.updatedAt, locale) })}</span>
          <Link href={`${base}/history`} className="inline-flex items-center gap-1 text-muted">
            <Icon name="history" className="h-4 w-4" />
            {t("wiki.historyCount", { count: props.revisionCount })}
          </Link>
          <Link href={`${base}/edit`} className="inline-flex items-center gap-1 font-semibold">
            <Icon name="edit" className="h-4 w-4" />
            {t("wiki.suggestEdit")}
          </Link>
          {props.englishOnly ? (
            <span className="rounded-full bg-sand px-2 py-0.5 text-xs">{t("wiki.englishOnly")}</span>
          ) : null}
        </div>
      </header>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <div className="mb-8 lg:hidden">
            <TableOfContents items={props.toc} />
          </div>
          {props.children}
        </div>
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          {props.aside}
          <div className="hidden lg:block">
            <TableOfContents items={props.toc} />
          </div>
        </aside>
      </div>
    </article>
  );
}

export function WikiSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="reading mb-10 scroll-mt-24">
      <h2 id={`${id}-h`} className="mb-3 text-2xl font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}
