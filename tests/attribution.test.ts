import { describe, expect, it } from "vitest";
import { carryAttribution, readAttribution } from "@/lib/attribution";

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) {
    data.set(key, value);
  }
  return data;
}

describe("izvor posjeta iz obrasca", () => {
  it("čita samo poznate oznake", () => {
    expect(readAttribution(form({ iz: "kako-se-oprostiti", cta: "poklon", name: "Žućo", utm_source: "facebook" }))).toEqual({
      iz: "kako-se-oprostiti",
      cta: "poklon",
      utm_source: "facebook",
    });
  });

  it("bez oznaka vraća null, pa narudžba ostaje bez izvora umjesto s praznim", () => {
    expect(readAttribution(form({ name: "Žućo", iz: "   " }))).toBeNull();
  });

  it("skraćuje predugu vrijednost", () => {
    expect(readAttribution(form({ iz: "a".repeat(500) }))?.iz).toHaveLength(120);
  });
});

describe("prenošenje izvora kroz poveznice", () => {
  it("dodaje oznake iz trenutne adrese", () => {
    expect(carryAttribution("/izradi", "?iz=kako-se-oprostiti&cta=pogledaj-primjer")).toBe(
      "/izradi?iz=kako-se-oprostiti&cta=pogledaj-primjer",
    );
  });

  it("ne prenosi ništa osim oznaka izvora", () => {
    expect(carryAttribution("/izradi", "?kljuc=tajna&dalje=%2Fadmin&utm_source=fb")).toBe("/izradi?utm_source=fb");
  });

  it("čuva postojeći upit i sidro, a oznaku koju poveznica već nosi ne mijenja", () => {
    expect(carryAttribution("/poklon?iz=alat-posveta#obrazac", "?iz=neki-clanak&cta=poklon")).toBe(
      "/poklon?iz=alat-posveta&cta=poklon#obrazac",
    );
  });

  it("bez oznaka u adresi poveznica ostaje ista", () => {
    expect(carryAttribution("/izradi", "")).toBe("/izradi");
    expect(carryAttribution("/izradi", "?stranica=2")).toBe("/izradi");
  });

  it("vanjske poveznice ne dira", () => {
    expect(carryAttribution("https://example.com/", "?iz=clanak")).toBe("https://example.com/");
    expect(carryAttribution("//example.com/", "?iz=clanak")).toBe("//example.com/");
  });
});
