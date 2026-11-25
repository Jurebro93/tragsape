/**
 * Naziv datoteke cjenika za strojno čitanje.
 *
 * Pravilnik o načinu objave cjenika proizvoda (NN 132/2026), čl. 6. st. 4.: zajednički cjenik za
 * sva prodajna mjesta nosi identifikacijski broj trgovca, oznaku „ZA_SVA_PRODAJNA_MJESTA",
 * naznaku radi li se o robi ili uslugama, broj pohrane i vremensku oznaku objave u obliku
 * GGGGMMDD_SSMM. Pravilnik ne propisuje razdjelnik između dijelova; ovdje je to podvlaka.
 */
export function priceListFilename(input: { sellerTaxId: string | null; version: number; publishedAt: string }): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Zagreb",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(input.publishedAt));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  const stamp = `${part("year")}${part("month")}${part("day")}_${part("hour")}${part("minute")}`;
  // Dok broj nije upisan, naziv to jasno pokazuje umjesto da izgleda potpun.
  const seller = input.sellerTaxId ?? "BEZ_BROJA";
  return `${seller}_ZA_SVA_PRODAJNA_MJESTA_USLUGE_${input.version}_${stamp}.csv`;
}
