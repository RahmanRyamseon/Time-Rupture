import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { search, type SearchDoc } from "@/lib/search";

let docs: SearchDoc[];
beforeAll(() => { docs = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "public", "search-index.json"), "utf8")); });

const ids = (q: string) => search(docs, q).hits.map((h) => h.doc.id);

describe("search", () => {
  it("matches Arabic with and without the definite article", () => {
    expect(ids("العود الكمبودي")).toContain("sa-dehn-el-oud-cambodi");
    expect(ids("عود كمبودي")).toContain("sa-dehn-el-oud-cambodi");
  });
  it("matches transliterations", () => {
    expect(ids("oudh cambodi")).toContain("sa-dehn-el-oud-cambodi");
    expect(ids("bukhoor")).toContain("ajmal-al-oud-bakhoor");
    expect(ids("taif")).toContain("asaq-taif-rose-al-shifa");
  });
  it("ignores diacritics and hamza variants in the query", () => {
    expect(ids("الوَرْد الطائفي")).toContain("asaq-taif-rose-al-shifa");
    expect(ids("اصول العود")).not.toHaveLength(0);
  });
  it("falls back to fuzzy matching on typos", () => {
    const r = search(docs, "shaheem");
    expect(r.fuzzy).toBe(true);
    expect(r.hits[0].doc.id).toBe("sa-dehn-el-oud-shaheen");
  });
  it("ranks name matches above body matches", () => {
    expect(ids("secret musk")[0]).toBe("sa-secret-musk");
  });
});
