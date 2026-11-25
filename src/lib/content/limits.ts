/** Granice iz baze (ograničenja `check` u migraciji sadržaja). Koriste ih provjera i sučelje. */
export const LIMITS = {
  title: 160,
  excerpt: 400,
  body: 200_000,
  seoTitle: 160,
  seoDescription: 320,
  sources: 100,
  sourceTitle: 240,
  sourceUrl: 600,
  sourceClaim: 400,
  sourcePublisher: 160,
  vetName: 160,
  ctaKey: 60,
  ctaHeading: 160,
  ctaBody: 600,
  ctaButton: 60,
  ctaTarget: 200,
} as const;

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const CTA_KEY_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}
