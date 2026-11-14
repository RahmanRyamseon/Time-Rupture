import { describe, expect, it } from "vitest";
import content from "@/generated/content.json";
import { diffSnapshots, snapshotOf } from "@/lib/snapshot";
import type { Content } from "@/lib/types";

const c = content as unknown as Content;

describe("dataset integrity", () => {
  it("every price has a source and a date", () => {
    for (const p of c.products) for (const pr of p.prices) {
      expect(c.citations[pr.citationId]).toBeDefined();
      expect(pr.observedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
  it("every non-empty descriptive field has a citation", () => {
    for (const p of c.products) if (p.description.ar) expect(p.citations.description?.length).toBeGreaterThan(0);
    for (const h of c.houses) if (h.history.ar) expect(h.citations.history?.length).toBeGreaterThan(0);
    for (const o of c.origins) for (const k of ["profile", "smell", "uses"] as const) if (o[k].ar) expect(o.citations[k]?.length).toBeGreaterThan(0);
  });
  it("only official-site links are used for products (no affiliate parameters)", () => {
    for (const p of c.products) expect(p.officialUrl).not.toMatch(/[?&](ref|aff|affiliate|utm_)/i);
  });
});

describe("revision diffs", () => {
  it("reports only changed fields", () => {
    const p = c.products[0];
    const before = snapshotOf("product", p);
    const after = { ...before, seasons: "winter" };
    expect(diffSnapshots(before, after)).toEqual([{ field: "seasons", before: before.seasons, after: "winter" }]);
  });
});
