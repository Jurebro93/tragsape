import { describe, expect, it } from "vitest";
import {
  countChars,
  countWords,
  isIndexable,
  MIN_DEDICATION_CHARS,
  MIN_STORY_WORDS,
  type IndexableInput,
} from "@/lib/indexing";

const longDedication = "š".repeat(MIN_DEDICATION_CHARS);
const longStory = Array.from({ length: MIN_STORY_WORDS }, (_, index) => `riječ${index}`).join(" ");

function memorial(overrides: Partial<IndexableInput> = {}): IndexableInput {
  return {
    status: "published",
    visibility: "public",
    cover_photo_id: "11111111-1111-4111-8111-111111111111",
    dedication: longDedication,
    story_md: null,
    ...overrides,
  };
}

describe("isIndexable", () => {
  it("prihvaća objavljen javni spomen s fotografijom i dovoljno dugom posvetom", () => {
    expect(isIndexable(memorial())).toBe(true);
  });

  it("prihvaća kratku posvetu ako priča ima dovoljno riječi", () => {
    expect(isIndexable(memorial({ dedication: "Kratko.", story_md: longStory }))).toBe(true);
    expect(isIndexable(memorial({ dedication: null, story_md: longStory }))).toBe(true);
  });

  it("odbija spomen „samo s poveznicom” i privatni, koliko god teksta imali", () => {
    expect(isIndexable(memorial({ visibility: "unlisted", story_md: longStory }))).toBe(false);
    expect(isIndexable(memorial({ visibility: "private", story_md: longStory }))).toBe(false);
  });

  it("odbija nepoznatu vidljivost umjesto da je smatra javnom", () => {
    expect(isIndexable(memorial({ visibility: "" }))).toBe(false);
    expect(isIndexable(memorial({ visibility: "PUBLIC" }))).toBe(false);
  });

  it("odbija nacrt i skriveni spomen", () => {
    expect(isIndexable(memorial({ status: "draft" }))).toBe(false);
    expect(isIndexable(memorial({ status: "hidden" }))).toBe(false);
  });

  it("odbija spomen bez naslovne fotografije", () => {
    expect(isIndexable(memorial({ cover_photo_id: null }))).toBe(false);
    expect(isIndexable(memorial({ cover_photo_id: "" }))).toBe(false);
  });

  it("odbija spomen s premalo teksta", () => {
    expect(isIndexable(memorial({ dedication: null, story_md: null }))).toBe(false);
    expect(isIndexable(memorial({ dedication: "Nedostaješ nam.", story_md: "Bio je dobar pas." }))).toBe(false);
  });

  it("drži granicu posvete na točno 80 znakova", () => {
    expect(isIndexable(memorial({ dedication: "a".repeat(MIN_DEDICATION_CHARS - 1) }))).toBe(false);
    expect(isIndexable(memorial({ dedication: "a".repeat(MIN_DEDICATION_CHARS) }))).toBe(true);
  });

  it("drži granicu priče na točno 100 riječi", () => {
    const almost = longStory.split(" ").slice(1).join(" ");
    expect(isIndexable(memorial({ dedication: null, story_md: almost }))).toBe(false);
    expect(isIndexable(memorial({ dedication: null, story_md: longStory }))).toBe(true);
  });

  it("ne dopušta da se prag posvete dosegne razmacima", () => {
    const padded = `Hvala ti.${" ".repeat(200)}\n\n\n`;
    expect(isIndexable(memorial({ dedication: padded }))).toBe(false);
  });
});

describe("countChars", () => {
  it("broji slova s dijakritičkim znakovima kao jedan znak, i kad su rastavljena", () => {
    expect(countChars("čćžšđ")).toBe(5);
    expect(countChars("č")).toBe(1);
  });

  it("uzastopne praznine broji kao jednu i zanemaruje rubne", () => {
    expect(countChars("  dobar \n\n  pas  ")).toBe("dobar pas".length);
    expect(countChars(null)).toBe(0);
    expect(countChars("   ")).toBe(0);
  });
});

describe("countWords", () => {
  it("broji riječi odvojene bilo kakvim prazninama", () => {
    expect(countWords("Volio je\tdugačke šetnje\n\nuz more.")).toBe(6);
  });

  it("ne broji oznake Markdowna bez slova i znamenki", () => {
    expect(countWords("# Naslov\n\n- prva\n- druga\n\n> ***\n\n---")).toBe(3);
  });

  it("vraća nulu za prazan tekst", () => {
    expect(countWords(null)).toBe(0);
    expect(countWords(undefined)).toBe(0);
    expect(countWords(" \n ")).toBe(0);
  });
});
