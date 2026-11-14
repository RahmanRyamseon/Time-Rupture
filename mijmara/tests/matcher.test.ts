import { describe, expect, it } from "vitest";
import content from "@/generated/content.json";
import { characterOf, MatcherInput, ruleMatch } from "@/lib/matcher";
import type { Content } from "@/lib/types";

const c = content as unknown as Content;
const ids = new Set(c.products.map((p) => p.id));

describe("rule-based matcher", () => {
  it("only returns ids that exist in the encyclopedia", () => {
    for (const character of ["", "sweet", "woody", "floral", "musky", "smoky"]) {
      const r = ruleMatch(c, MatcherInput.parse({ character, locale: "ar" }), new Map());
      for (const x of r) expect(ids.has(x.id)).toBe(true);
    }
  });
  it("uses documented seasons", () => {
    const r = ruleMatch(c, MatcherInput.parse({ season: "winter", locale: "en" }), new Map());
    expect(r.map((x) => x.id)).toEqual(expect.arrayContaining(["sa-secret-musk", "sa-dehn-el-oud-cambodi"]));
  });
  it("derives character only from documented notes and origins", () => {
    const musk = c.products.find((p) => p.id === "sa-secret-musk")!;
    expect(characterOf(c, musk).has("musky")).toBe(true);
    expect(characterOf(c, musk).has("animalic")).toBe(false);
  });
  it("returns nothing when no documented entry fits", () => {
    expect(ruleMatch(c, MatcherInput.parse({ occasion: "ramadan", locale: "ar" }), new Map())).toEqual([]);
  });
});
