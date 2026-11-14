import { describe, expect, it } from "vitest";
import { expandToken, normalize, slugify, stemToken, tokenize } from "@/lib/normalize";

describe("Arabic normalisation", () => {
  it("folds alef forms, taa marbuta, alif maqsura and hamza carriers", () => {
    expect(normalize("أإآٱ")).toBe("اااا");
    expect(normalize("مبخرة")).toBe("مبخره");
    expect(normalize("مستشفى")).toBe("مستشفي");
    expect(normalize("مؤسسة شاطئ")).toBe("موسسه شاطي");
  });
  it("removes diacritics and tatweel", () => {
    expect(normalize("العُودُ الهِنْديّ")).toBe("العود الهندي");
    expect(normalize("عـــود")).toBe("عود");
  });
  it("converts Arabic-Indic digits", () => {
    expect(normalize("١٢ مل")).toBe("12 مل");
  });
  it("strips clitics for matching", () => {
    expect(stemToken("العود")).toBe("عود");
    expect(stemToken("بالعود")).toBe("عود");
    expect(stemToken("ال")).toBe("ال");
    expect(tokenize("والبخور")).toEqual(["بخور"]);
  });
  it("expands transliterations", () => {
    expect(expandToken("oudh")).toContain("عود");
    expect(expandToken("dahn")).toContain("دهن");
    expect(expandToken("عود")).toContain("ood");
  });
  it("makes Arabic slugs", () => {
    expect(slugify("دهن العُود شاهين")).toBe("دهن-العود-شاهين");
    expect(slugify("Dehn El Oud!")).toBe("dehn-el-oud");
  });
});
