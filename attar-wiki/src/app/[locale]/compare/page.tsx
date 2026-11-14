import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCompareData } from "@/lib/data/wiki";
import { pageMetadata } from "@/lib/metadata";
import { formatInr, pick } from "@/lib/i18n-content";
import { VOTE_METRICS } from "@/lib/types";
import { SearchBox } from "@/components/layout/SearchBox";
import { CompareSync } from "./CompareSync";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ items?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return pageMetadata("/compare", locale, t("compare.title"), t("compare.help"), { robots: { index: false, follow: true } });
}

export default async function ComparePage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { items = "" } = await searchParams;
  const t = await getTranslations();
  const data = await getCompareData(items.split(","));
  const nd = <span className="italic text-muted">—</span>;

  const rows: { label: string; render: (d: (typeof data)[number]) => React.ReactNode }[] = [
    { label: t("field.house_id"), render: (d) => (d.house ? <Link href={`/houses/${d.house.slug}`}>{d.house.name}</Link> : nd) },
    { label: t("field.attar_type"), render: (d) => (d.attar.attar_type ? t(`attarType.${d.attar.attar_type}`) : nd) },
    { label: t("field.base_oil"), render: (d) => d.attar.base_oil ?? nd },
    { label: t("field.scent_family"), render: (d) => d.attar.scent_family ?? nd },
    { label: t("field.region_id"), render: (d) => (d.region ? <Link href={`/regions/${d.region.slug}`}>{d.region.name}</Link> : nd) },
    ...(["top", "heart", "base"] as const).map((pos) => ({
      label: t(`position.${pos}`),
      render: (d: (typeof data)[number]) => {
        const notes = d.notes.filter((n) => n.position === pos);
        return notes.length ? (
          <ul className="flex flex-wrap gap-1">
            {notes.map((n) => (
              <li key={n.note.id}>
                <Link href={`/notes/${n.note.slug}`} className="chip min-h-7 px-2 text-xs">
                  {pick(locale, n.note.name, n.note.name_hi).text}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          nd
        );
      },
    })),
    ...VOTE_METRICS.map((m) => ({
      label: t(`metric.${m}`),
      render: (d: (typeof data)[number]) => {
        const s = d.stats.find((x) => x.metric === m);
        return s && s.vote_count > 0 ? (
          <span className="tabular-nums">
            {Number(s.vote_avg).toFixed(1)}/5 <span className="text-xs text-muted">({t("attar.votes", { count: s.vote_count })})</span>
          </span>
        ) : (
          nd
        );
      },
    })),
    {
      label: t("field.price"),
      render: (d) => {
        const p = d.prices[0];
        return p ? (
          <span className="text-sm">
            {t("attar.per10", {
              min: formatInr((Number(p.price_min_inr) / Number(p.volume_ml)) * 10, locale),
              max: formatInr((Number(p.price_max_inr) / Number(p.volume_ml)) * 10, locale),
            })}
            <span className="block text-xs text-muted">{p.source_name}</span>
          </span>
        ) : (
          nd
        );
      },
    },
    { label: t("field.occasions"), render: (d) => (d.attar.occasions.length ? d.attar.occasions.join(", ") : nd) },
  ];

  return (
    <div className="container-wiki py-10">
      <CompareSync items={data.map((d) => ({ slug: d.attar.slug, name: d.attar.name }))} />
      <h1 className="text-4xl font-semibold">{t("compare.title")}</h1>
      <p className="reading mt-2 text-muted">{t("compare.help")}</p>
      {data.length < 4 ? (
        <div className="mt-6 max-w-md">
          <p className="label">{t("compare.add")}</p>
          <SearchBox compact />
        </div>
      ) : null}

      {data.length === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed border-line bg-sand/50 p-6 text-muted">{t("compare.empty")}</p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-xl border border-line bg-white/70">
          <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
            <caption className="sr-only">{t("compare.title")}</caption>
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="w-40 p-3" />
                {data.map((d) => (
                  <th key={d.attar.id} scope="col" className="p-3 align-bottom">
                    <Link href={`/attars/${d.attar.slug}`} className="font-display text-lg font-semibold">
                      {pick(locale, d.attar.name, d.attar.name_hi).text}
                    </Link>
                    <Link
                      href={{ pathname: "/compare", query: { items: data.filter((x) => x !== d).map((x) => x.attar.slug).join(",") } }}
                      className="mt-1 block text-xs font-normal text-muted"
                    >
                      {t("compare.remove")}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-line/60 align-top">
                  <th scope="row" className="p-3 font-medium text-muted">
                    {row.label}
                  </th>
                  {data.map((d) => (
                    <td key={d.attar.id} className="p-3">
                      {row.render(d)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
