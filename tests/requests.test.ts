import { describe, expect, it } from "vitest";
import { checkQuestion, normalizePage } from "@/lib/requests";

describe("pitanja čitatelja", () => {
  it("pitanje mora imati od 10 do 1000 znakova, razmaci se sažimaju", () => {
    expect(checkQuestion("kratko")).toEqual({ ok: false });
    expect(checkQuestion("Mačka   pije puno vode, zašto?")).toEqual({ ok: true, question: "Mačka pije puno vode, zašto?" });
    expect(checkQuestion("a".repeat(1001))).toEqual({ ok: false });
    expect(checkQuestion(42)).toEqual({ ok: false });
  });

  it("stranica je samo putanja na ovoj stranici, bez upita i vanjskih adresa", () => {
    expect(normalizePage("/vodic/zdravlje-macaka?x=1#a")).toBe("/vodic/zdravlje-macaka");
    expect(normalizePage("https://drugi.hr/")).toBeNull();
    expect(normalizePage("//drugi.hr/")).toBeNull();
  });
});
