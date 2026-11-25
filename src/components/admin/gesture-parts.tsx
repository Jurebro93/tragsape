import { Badge } from "@/components/admin/ui";
import { adminPanel } from "@/messages/hr/admin-panel";

/** Prikaz gesta koji dijele popis gesta, narudžba i moderacija. */

const t = adminPanel.gestures;

export function GestureStateBadge({ state }: { state: keyof typeof t.status }) {
  const tone = state === "active" ? "good" : state === "refunded" ? "bad" : state === "hidden" ? "warn" : "neutral";
  return <Badge tone={tone}>{t.status[state]}</Badge>;
}

export function gestureKindLabel(kind: string): string {
  return kind in t.kinds ? t.kinds[kind as keyof typeof t.kinds] : kind;
}
