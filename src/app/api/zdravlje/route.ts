/**
 * Provjera zdravlja za hosting (Render: `healthCheckPath`).
 * Namjerno ne dira bazu ni vanjske servise: odgovara čim poslužitelj prima zahtjeve,
 * pa kratak zastoj baze ne ruši i samu aplikaciju.
 */
export function GET() {
  return Response.json({ ok: true });
}
