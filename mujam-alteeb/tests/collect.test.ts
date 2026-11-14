import { describe, expect, it } from "vitest";
import content from "@/generated/content.json";
import type { Content } from "@/lib/types";
import { disallowed } from "../scripts/collect/fetch-shopify";
import { matchNote, NOTE_DICTIONARY } from "../scripts/collect/note-dictionary";
import { STORES } from "../scripts/collect/stores";

const c = content as unknown as Content;

describe("robots.txt matching", () => {
  const robots = "User-agent: *\nDisallow: /*/collections/*sort_by*\nDisallow: /cart\nDisallow: /products/*.json$\nAllow: /cart/public\n\nUser-agent: OtherBot\nDisallow: /\n";
  it("allows the product feed when no rule matches", () => expect(disallowed(robots, "/products.json?limit=250&page=1")).toBe(false));
  it("honours wildcards and $ anchors", () => {
    expect(disallowed(robots, "/en/collections/a?sort_by=price")).toBe(true);
    expect(disallowed(robots, "/products/rose.json")).toBe(true);
    expect(disallowed(robots, "/products/rose.json?x=1")).toBe(false);
  });
  it("applies the longest match, Allow winning", () => expect(disallowed(robots, "/cart/public")).toBe(false));
  it("ignores groups for other user agents", () => expect(disallowed(robots, "/about")).toBe(false));
});

describe("note dictionary", () => {
  it("matches exact aliases only", () => {
    expect(matchNote("Agarwood (Oud)")?.id).toBe("oud");
    expect(matchNote(" Tonka Bean ")?.id).toBe("tonka-bean");
    expect(matchNote("adding depth")).toBeUndefined();
    expect(matchNote("ros")).toBeUndefined();
  });
  it("gives every entry an Arabic name and a unique id", () => {
    const ids = new Set<string>();
    for (const d of NOTE_DICTIONARY) {
      expect(d.ar).toMatch(/[؀-ۿ]/);
      expect(ids.has(d.id)).toBe(false);
      ids.add(d.id);
    }
  });
});

describe("collected products", () => {
  const collected = c.products.filter((p) => p.source === "collected");
  const hosts = new Map(STORES.map((s) => [s.houseId, new Set<string>()]));
  for (const s of STORES) hosts.get(s.houseId)!.add(s.host);
  it("exist", () => expect(collected.length).toBeGreaterThan(100));
  it("cite their own house's official store for name and description", () => {
    for (const p of collected) {
      for (const field of ["name", "description"]) {
        const cid = p.citations[field]?.[0];
        expect(cid, `${p.id} ${field}`).toBeDefined();
        const host = new URL(c.citations[cid].url).host;
        expect(hosts.get(p.houseId)?.has(host), `${p.id} → ${host}`).toBe(true);
      }
    }
  });
  it("only claim a family when at least three notes are listed", () => {
    for (const p of c.products) if (p.family) expect(new Set([...p.notes.top, ...p.notes.heart, ...p.notes.base].map((n) => n.note)).size).toBeGreaterThanOrEqual(3);
  });
  it("never carry affiliate parameters", () => {
    for (const p of collected) expect(p.officialUrl).not.toMatch(/[?&](ref|aff|affiliate|utm_)/i);
  });
});
