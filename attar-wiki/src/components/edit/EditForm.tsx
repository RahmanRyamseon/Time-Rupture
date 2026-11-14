"use client";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { SECTION_DEFS, slugify, type FieldDef, type Section } from "@/lib/sections";
import type { NotePosition, RelationType } from "@/lib/types";

export interface EditOptions {
  houses: { id: string; name: string }[];
  regions: { id: string; name: string }[];
  notes: { id: string; name: string }[];
  attars: { id: string; name: string }[];
  currentNotes: { note_id: string; position: NotePosition }[];
  currentRelations: { related_attar_id: string | null; external_name: string | null; relation: RelationType; note: string | null }[];
  baseRevisionId: number | null;
}

type Values = Record<string, unknown>;
interface CitationRow {
  field_name: string;
  url: string;
  title: string;
  publisher: string;
}

function toInput(f: FieldDef, v: unknown): string {
  if (v == null) return "";
  if (f.kind === "tags") return (v as string[]).join(", ");
  return String(v);
}

function fromInput(f: FieldDef, s: string): unknown {
  const v = s.trim();
  if (f.kind === "tags") return v ? v.split(",").map((x) => x.trim()).filter(Boolean) : [];
  if (v === "") return f.name === "slug" ? "" : null;
  if (f.kind === "number") return Number(v);
  return v;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export function EditForm({ section, row, options }: { section: Section; row: Values | null; options: EditOptions }) {
  const t = useTranslations();
  const router = useRouter();
  const { user, isEditor, enabled, loading } = useAuth();
  const def = SECTION_DEFS[section];
  const isAttar = section === "attars";

  const initial = useMemo(() => Object.fromEntries(def.fields.map((f) => [f.name, toInput(f, row?.[f.name])])), [def, row]);
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [slugTouched, setSlugTouched] = useState(Boolean(row));
  const [notes, setNotes] = useState(options.currentNotes);
  const [relations, setRelations] = useState(options.currentRelations);
  const [price, setPrice] = useState({ price_min_inr: "", price_max_inr: "", volume_ml: "", reported_on: "", source_name: "", source_url: "" });
  const [citations, setCitations] = useState<CitationRow[]>([]);
  const [summary, setSummary] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  if (!enabled) return <p className="mt-6 text-danger">{t("auth.unavailable")}</p>;
  if (loading) return <p className="mt-6 text-muted">{t("common.loading")}</p>;
  if (!user)
    return (
      <p className="mt-6">
        <Link href="/sign-in" className="btn-primary">
          {t("edit.signIn")}
        </Link>
      </p>
    );

  const citableFields = [...def.fields.filter((f) => f.citable || f.kind === "markdown").map((f) => f.name), ...(isAttar ? ["notes", "price"] : [])];

  function set(name: string, v: string) {
    setValues((cur) => {
      const next = { ...cur, [name]: v };
      if (!row && name === def.titleField && !slugTouched) next.slug = slugify(v);
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const fields: Values = {};
    for (const f of def.fields) {
      const nextVal = fromInput(f, values[f.name] ?? "");
      const prevVal = row ? (row[f.name] ?? (f.kind === "tags" ? [] : null)) : f.kind === "tags" ? [] : null;
      if (!same(nextVal, prevVal) && !(f.kind !== "tags" && nextVal === null && prevVal === null)) fields[f.name] = nextVal;
    }
    const notesChanged = isAttar && !same(notes, options.currentNotes);
    const relChanged = isAttar && !same(relations, options.currentRelations);
    const hasPrice = isAttar && price.price_min_inr && price.price_max_inr && price.volume_ml && price.reported_on && price.source_name;
    const cites = citations.filter((c) => c.url && c.title);
    if (!Object.keys(fields).length && !notesChanged && !relChanged && !hasPrice && !cites.length) {
      setMessage(t("edit.noChanges"));
      return;
    }
    setState("saving");
    setMessage(null);
    const res = await fetch("/api/v1/edits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section,
        entityId: (row?.id as string) ?? null,
        baseRevisionId: options.baseRevisionId,
        summary,
        fields,
        notes: notesChanged ? notes : undefined,
        relations: relChanged
          ? relations.map((r) => ({ ...r, related_attar_id: r.related_attar_id || null, external_name: r.external_name || null }))
          : undefined,
        priceReport: hasPrice
          ? {
              price_min_inr: Number(price.price_min_inr),
              price_max_inr: Number(price.price_max_inr),
              volume_ml: Number(price.volume_ml),
              reported_on: price.reported_on,
              source_name: price.source_name,
              source_url: price.source_url || null,
            }
          : undefined,
        citations: cites.length ? cites.map((c) => ({ ...c, publisher: c.publisher || null })) : undefined,
      }),
    }).catch(() => null);
    const body = res ? ((await res.json().catch(() => ({}))) as { status?: string; slug?: string; error?: string; details?: unknown }) : {};
    if (!res?.ok) {
      setState("error");
      setMessage(body.error ? `${body.error}${body.details ? `: ${JSON.stringify(body.details)}` : ""}` : t("common.error"));
      return;
    }
    setState("done");
    if (body.status === "approved" && body.slug) {
      setMessage(t("edit.published"));
      router.push(`/${section}/${body.slug}`);
    } else setMessage(t("edit.submitted"));
  }

  const input = (f: FieldDef) => {
    const id = `f-${f.name}`;
    const common = {
      id,
      name: f.name,
      value: values[f.name] ?? "",
      required: f.required,
      maxLength: f.maxLength,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        if (f.name === "slug") setSlugTouched(true);
        set(f.name, e.target.value);
      },
      className: "input",
      lang: f.hindi ? "hi" : undefined,
    };
    let control: React.ReactNode;
    switch (f.kind) {
      case "textarea":
        control = <textarea {...common} className="input min-h-24" />;
        break;
      case "markdown":
        control = <textarea {...common} className="input min-h-48 font-mono text-sm" />;
        break;
      case "number":
        control = <input {...common} type="number" inputMode="numeric" step="any" />;
        break;
      case "url":
        control = <input {...common} type="url" inputMode="url" placeholder="https://" />;
        break;
      case "select":
        control = (
          <select {...common}>
            <option value="">—</option>
            {f.options!.map((o) => (
              <option key={o} value={o}>
                {t.has(`attarType.${o}`) ? t(`attarType.${o}`) : o}
              </option>
            ))}
          </select>
        );
        break;
      case "house_ref":
      case "region_ref": {
        const list = f.kind === "house_ref" ? options.houses : options.regions;
        control = (
          <select {...common}>
            <option value="">—</option>
            {list.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        );
        break;
      }
      default:
        control = <input {...common} type="text" pattern={f.name === "slug" ? "[a-z0-9]+(-[a-z0-9]+)*" : undefined} />;
    }
    return (
      <div key={f.name}>
        <label htmlFor={id} className="label">
          {t(`field.${f.name}`)}
          {f.required ? " *" : ""}
          {f.citable ? <span className="ml-2 text-xs font-normal text-muted">({t("edit.citations").toLowerCase()} ✓)</span> : null}
        </label>
        {control}
        {f.kind === "tags" ? <p className="help">{t("edit.tagsHelp")}</p> : null}
        {f.kind === "markdown" ? <p className="help">Markdown</p> : null}
      </div>
    );
  };

  return (
    <form onSubmit={submit} className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-8">
        <fieldset className="space-y-4">
          <legend className="sr-only">{t("edit.summary")}</legend>
          {def.fields.filter((f) => !f.hindi).map(input)}
        </fieldset>

        {isAttar ? (
          <fieldset className="space-y-3">
            <legend className="text-xl font-semibold text-bark">{t("edit.notes")}</legend>
            {notes.map((n, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <label className="sr-only" htmlFor={`note-${i}`}>
                  {t("field.notes")}
                </label>
                <select
                  id={`note-${i}`}
                  className="input max-w-xs flex-1"
                  value={n.note_id}
                  onChange={(e) => setNotes(notes.map((x, j) => (j === i ? { ...x, note_id: e.target.value } : x)))}
                >
                  {options.notes.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={t("edit.notes")}
                  className="input w-36"
                  value={n.position}
                  onChange={(e) => setNotes(notes.map((x, j) => (j === i ? { ...x, position: e.target.value as NotePosition } : x)))}
                >
                  {(["top", "heart", "base"] as const).map((p) => (
                    <option key={p} value={p}>
                      {t(`position.${p}`)}
                    </option>
                  ))}
                </select>
                <button type="button" className="btn-ghost px-3" onClick={() => setNotes(notes.filter((_, j) => j !== i))}>
                  ✕<span className="sr-only">{t("compare.remove")}</span>
                </button>
              </div>
            ))}
            {options.notes.length ? (
              <button type="button" className="btn-secondary" onClick={() => setNotes([...notes, { note_id: options.notes[0].id, position: "heart" }])}>
                + {t("edit.addNote")}
              </button>
            ) : (
              <p className="help">
                <Link href="/new/notes">{t("wiki.proposePage")}</Link>
              </p>
            )}
          </fieldset>
        ) : null}

        {isAttar ? (
          <fieldset className="space-y-3">
            <legend className="text-xl font-semibold text-bark">{t("edit.relations")}</legend>
            {relations.map((r, i) => (
              <div key={i} className="grid gap-2 rounded-lg border border-line p-3 sm:grid-cols-[10rem_1fr_1fr_auto]">
                <select
                  aria-label={t("edit.relations")}
                  className="input"
                  value={r.relation}
                  onChange={(e) => setRelations(relations.map((x, j) => (j === i ? { ...x, relation: e.target.value as RelationType } : x)))}
                >
                  {(["similar", "clone_of", "inspired_by"] as const).map((rel) => (
                    <option key={rel} value={rel}>
                      {t(`relation.${rel}`)}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={t("types.attar")}
                  className="input"
                  value={r.related_attar_id ?? ""}
                  onChange={(e) => setRelations(relations.map((x, j) => (j === i ? { ...x, related_attar_id: e.target.value || null } : x)))}
                >
                  <option value="">—</option>
                  {options.attars.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                <input
                  aria-label={t("edit.externalName")}
                  placeholder={t("edit.externalName")}
                  className="input"
                  value={r.external_name ?? ""}
                  onChange={(e) => setRelations(relations.map((x, j) => (j === i ? { ...x, external_name: e.target.value } : x)))}
                />
                <button type="button" className="btn-ghost px-3" onClick={() => setRelations(relations.filter((_, j) => j !== i))}>
                  ✕<span className="sr-only">{t("compare.remove")}</span>
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setRelations([...relations, { relation: "similar", related_attar_id: null, external_name: "", note: null }])}
            >
              + {t("edit.addRelation")}
            </button>
          </fieldset>
        ) : null}

        {isAttar ? (
          <fieldset className="space-y-3">
            <legend className="text-xl font-semibold text-bark">{t("edit.price")}</legend>
            <p className="help">{t("attar.priceHelp")}</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {(
                [
                  ["price_min_inr", t("edit.priceMin"), "number"],
                  ["price_max_inr", t("edit.priceMax"), "number"],
                  ["volume_ml", t("edit.volume"), "number"],
                  ["reported_on", t("edit.reportedOn"), "date"],
                  ["source_name", t("edit.sourceName"), "text"],
                  ["source_url", t("edit.sourceUrl"), "url"],
                ] as const
              ).map(([k, label, type]) => (
                <div key={k}>
                  <label htmlFor={`p-${k}`} className="label">
                    {label}
                  </label>
                  <input
                    id={`p-${k}`}
                    type={type}
                    min={type === "number" ? 0 : undefined}
                    step="any"
                    className="input"
                    value={price[k]}
                    onChange={(e) => setPrice({ ...price, [k]: e.target.value })}
                  />
                </div>
              ))}
            </div>
          </fieldset>
        ) : null}

        <details className="rounded-lg border border-line p-4" open={def.fields.some((f) => f.hindi && values[f.name])}>
          <summary className="cursor-pointer font-semibold text-bark">{t("edit.hindi")}</summary>
          <div className="mt-4 space-y-4">{def.fields.filter((f) => f.hindi).map(input)}</div>
        </details>
      </div>

      <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
        <fieldset className="card space-y-3 p-4">
          <legend className="sr-only">{t("edit.citations")}</legend>
          <p className="font-semibold text-bark">{t("edit.citations")}</p>
          <p className="help mt-0">{t("edit.citationsHelp")}</p>
          {citations.map((c, i) => (
            <div key={i} className="space-y-2 rounded-lg border border-line p-3">
              <select
                aria-label={t("edit.citationField")}
                className="input"
                value={c.field_name}
                onChange={(e) => setCitations(citations.map((x, j) => (j === i ? { ...x, field_name: e.target.value } : x)))}
              >
                {citableFields.map((f) => (
                  <option key={f} value={f}>
                    {t(`field.${f}`)}
                  </option>
                ))}
              </select>
              <input
                aria-label={t("edit.citationUrl")}
                placeholder="https://"
                type="url"
                required
                className="input"
                value={c.url}
                onChange={(e) => setCitations(citations.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))}
              />
              <input
                aria-label={t("edit.citationTitle")}
                placeholder={t("edit.citationTitle")}
                required
                className="input"
                value={c.title}
                onChange={(e) => setCitations(citations.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
              />
              <button type="button" className="text-sm text-muted underline" onClick={() => setCitations(citations.filter((_, j) => j !== i))}>
                {t("compare.remove")}
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn-secondary w-full"
            onClick={() => setCitations([...citations, { field_name: citableFields[0] ?? "body", url: "", title: "", publisher: "" }])}
          >
            + {t("edit.addCitation")}
          </button>
        </fieldset>

        <div className="card space-y-3 p-4">
          <label htmlFor="summary" className="label">
            {t("edit.summary")} *
          </label>
          <textarea
            id="summary"
            required
            minLength={5}
            maxLength={500}
            className="input min-h-20"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            aria-describedby="summary-help"
          />
          <p id="summary-help" className="help mt-0">
            {t("edit.summaryHelp")}
          </p>
          <button type="submit" className="btn-primary w-full" disabled={state === "saving" || state === "done"}>
            {isEditor ? t("edit.submitEditor") : t("edit.submit")}
          </button>
          {message ? (
            <p role={state === "error" ? "alert" : "status"} className={`text-sm ${state === "error" ? "text-danger" : "text-ok"}`}>
              {message}
            </p>
          ) : null}
        </div>

        {row ? <ImageUpload entityType={def.type} entityId={row.id as string} /> : null}
      </aside>
    </form>
  );
}

const LICENSES = ["OWN-WORK-CC-BY-SA-4.0", "CC-BY-4.0", "CC-BY-SA-4.0", "CC0-1.0", "BRAND-PERMISSION"] as const;

function ImageUpload({ entityType, entityId }: { entityType: string; entityId: string }) {
  const t = useTranslations("edit");
  const [license, setLicense] = useState<string>(LICENSES[0]);
  const [status, setStatus] = useState<string | null>(null);

  // Rendered as a nested <fieldset> but submitted independently (not part of the edit form).
  async function upload(el: HTMLFieldSetElement) {
    const get = (n: string) => (el.querySelector(`[name="${n}"]`) as HTMLInputElement | null)?.value ?? "";
    const fileInput = el.querySelector('input[type="file"]') as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) return;
    const dims = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ w: 0, h: 0 });
      img.src = URL.createObjectURL(file);
    });
    const fd = new FormData();
    fd.set("file", file);
    fd.set("entityType", entityType);
    fd.set("entityId", entityId);
    fd.set("alt", get("img-alt"));
    fd.set("license", license);
    fd.set("credit", get("img-credit"));
    fd.set("sourceUrl", get("img-source"));
    fd.set("permissionNote", get("img-permission"));
    if (dims.w) {
      fd.set("width", String(dims.w));
      fd.set("height", String(dims.h));
    }
    const res = await fetch("/api/v1/media", { method: "POST", body: fd }).catch(() => null);
    const body = res ? ((await res.json().catch(() => ({}))) as { error?: string }) : {};
    setStatus(res?.ok ? t("imageUploaded") : (body.error ?? "Error"));
  }

  return (
    <fieldset className="card space-y-3 p-4">
      <legend className="sr-only">{t("image")}</legend>
      <p className="font-semibold text-bark">{t("image")}</p>
      <p className="help mt-0">{t("imageHelp")}</p>
      <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" aria-label={t("image")} className="block w-full text-sm" />
      <div>
        <label htmlFor="img-license" className="label">
          {t("imageLicense")}
        </label>
        <select id="img-license" className="input" value={license} onChange={(e) => setLicense(e.target.value)}>
          {LICENSES.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <input name="img-credit" aria-label={t("imageCredit")} placeholder={t("imageCredit")} className="input" />
      <input name="img-alt" aria-label={t("imageAlt")} placeholder={t("imageAlt")} className="input" />
      <input name="img-source" type="url" aria-label={t("imageSource")} placeholder={t("imageSource")} className="input" />
      {license === "BRAND-PERMISSION" ? (
        <textarea name="img-permission" aria-label={t("imagePermission")} placeholder={t("imagePermission")} className="input min-h-20" />
      ) : null}
      <button
        type="button"
        className="btn-secondary w-full"
        onClick={(e) => {
          const fs = e.currentTarget.closest("fieldset") as HTMLFieldSetElement;
          void upload(fs);
        }}
      >
        {t("imageUpload")}
      </button>
      {status ? (
        <p role="status" className="text-sm">
          {status}
        </p>
      ) : null}
    </fieldset>
  );
}
