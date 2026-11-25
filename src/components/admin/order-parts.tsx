import { Badge, RowLink } from "@/components/admin/ui";
import { fill } from "@/lib/text";
import { adminPanel } from "@/messages/hr/admin-panel";

/** Dijelovi koje dijele popis narudžbi, pojedinačna narudžba i popisi koji pokazuju spomen. */

const t = adminPanel.orders;
const common = adminPanel.common;

type OrderStatusKey = keyof typeof t.status;

export function OrderStatusBadge({ status }: { status: string }) {
  const label = status in t.status ? t.status[status as OrderStatusKey] : status;
  const tone = status === "paid" ? "good" : status === "pending" ? "warn" : status === "refunded" ? "bad" : "neutral";
  return <Badge tone={tone}>{label}</Badge>;
}

/** Naziv stavke: naziv proizvoda iz cjenika, a za poklon s oznakom da je poklon. */
export function lineLabel(line: { kind: string; productKey: string }, productNames: Record<string, string>): string {
  const product = productNames[line.productKey] ?? line.productKey;
  return line.kind === "gift" ? fill(t.giftPrefix, { product }) : product;
}

/** Sažetak stavki za popis: „Memorijal, 2 × Gesta, 7 dana". */
export function summarizeLines(
  lines: Array<{ kind: string; productKey: string }>,
  productNames: Record<string, string>,
): string {
  const counts = new Map<string, number>();
  for (const line of lines) {
    const label = lineLabel(line, productNames);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts].map(([label, count]) => (count > 1 ? `${count} × ${label}` : label)).join(", ");
}

type MemorialStatusKey = keyof typeof common.memorialStatus;

export function memorialStatusLabel(status: string): string {
  return status in common.memorialStatus ? common.memorialStatus[status as MemorialStatusKey] : status;
}

export function MemorialStatusBadge({ status }: { status: string }) {
  const tone = status === "published" ? "good" : status === "hidden" ? "bad" : "warn";
  return <Badge tone={tone}>{memorialStatusLabel(status)}</Badge>;
}

/**
 * Ime spomena sa stanjem. Poveznica na javnu stranicu postoji samo za objavljen i javan
 * spomen; privatne i skrivene admin ne otvara odavde.
 */
export function MemorialCell({
  memorial,
  missing,
}: {
  memorial: { name: string; slug: string; status: string; visibility: string } | null;
  /** Tekst kad spomena nema. */
  missing: string;
}) {
  if (!memorial) {
    return <span className="text-plum-soft">{missing}</span>;
  }
  const isPublic = memorial.status === "published" && memorial.visibility === "public";
  return (
    <span className="flex flex-col items-start gap-1">
      <span className="font-bold [overflow-wrap:anywhere]">{memorial.name || common.untitled}</span>
      <MemorialStatusBadge status={memorial.status} />
      {isPublic ? (
        <RowLink href={`/spomen/${memorial.slug}`} external>
          {common.openPublic}
        </RowLink>
      ) : null}
    </span>
  );
}
