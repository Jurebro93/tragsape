import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { admin } from "@/messages/hr/admin";
import { requireAdmin } from "@/server/auth";

export const metadata: Metadata = { title: admin.title, robots: { index: false, follow: false } };

/** Ulaz u admin: tko nije admin, dobiva 404 prije nego što se išta prikaže. */
async function AdminGate({ children }: { children: ReactNode }) {
  await requireAdmin("/admin");
  return <AdminShell>{children}</AdminShell>;
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-vanilla" />}>
      <AdminGate>{children}</AdminGate>
    </Suspense>
  );
}
