import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createSessionClient } from "@/server/supabase/session";

export type Viewer = {
  id: string;
  email: string | null;
  /** Anonimni korisnik: ima nacrt, ali još nije potvrdio e-mail. */
  isAnonymous: boolean;
};

/** Trenutni posjetitelj iz provjerenog JWT-a, ili null. Jednom po zahtjevu. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) {
    return null;
  }
  const claims = data.claims;
  return {
    id: claims.sub,
    email: typeof claims.email === "string" && claims.email !== "" ? claims.email : null,
    isAnonymous: claims.is_anonymous === true,
  };
});

/** Traži prijavljenog korisnika s potvrđenim e-mailom; inače vodi na prijavu. */
export async function requireMember(nextPath: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer || viewer.isAnonymous) {
    redirect(`/prijava?dalje=${encodeURIComponent(nextPath)}`);
  }
  return viewer;
}

/**
 * Traži admina. Ostalima stranica ne postoji (404), da se ne otkriva ni da admin postoji.
 * Svaka admin stranica i svaka admin akcija zove ovo sama; RLS provjerava isto u bazi.
 */
export async function requireAdmin(nextPath = "/admin"): Promise<Viewer> {
  const viewer = await requireMember(nextPath);
  const supabase = await createSessionClient();
  const { data } = await supabase.rpc("is_admin");
  if (data !== true) {
    notFound();
  }
  return viewer;
}

/** Vraća postojećeg posjetitelja ili otvara anonimnu sesiju (za prvi nacrt). */
export async function ensureViewer(): Promise<Viewer> {
  const existing = await getViewer();
  if (existing) {
    return existing;
  }
  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) {
    throw new Error("Anonimna sesija nije otvorena: " + (error?.message ?? "nepoznato"));
  }
  return { id: data.user.id, email: null, isAnonymous: true };
}

/** Dopušta samo putanje unutar stranice; sve ostalo vodi na zadanu. */
export function safeNextPath(value: string | null | undefined, fallback = "/moji-ljubimci"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }
  return value;
}
