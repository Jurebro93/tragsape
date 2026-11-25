import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/server/supabase/database.types";

/** Učitava .env.local u process.env (samo vrijednosti koje još nisu postavljene). */
export function loadLocalEnv(): void {
  const path = fileURLToPath(new URL("../../.env.local", import.meta.url));
  let content = "";
  try {
    content = readFileSync(path, "utf8");
  } catch {
    return;
  }
  for (const line of content.split("\n")) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (!match) {
      continue;
    }
    const value = match[2].replace(/^"(.*)"$/, "$1");
    if (process.env[match[1]] === undefined || process.env[match[1]] === "") {
      process.env[match[1]] = value;
    }
  }
}

loadLocalEnv();

export type Client = SupabaseClient<Database>;

const url = () => process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const publishableKey = () => process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string;
const secretKey = () => process.env.SUPABASE_SECRET_KEY as string;

const clientOptions = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

export function adminClient(): Client {
  return createClient<Database>(url(), secretKey(), clientOptions);
}

/** Klijent anonimnog posjetitelja; `shareKey` oponaša poveznicu „samo s linkom". */
export function anonClient(shareKey?: string): Client {
  return createClient<Database>(url(), publishableKey(), {
    ...clientOptions,
    global: shareKey ? { headers: { "x-share-key": shareKey } } : undefined,
  });
}

const createdUsers: string[] = [];

export type TestUser = { id: string; email: string; client: Client };

/** Stvara korisnika s potvrđenim e-mailom i vraća klijenta prijavljenog kao on. */
export async function createUser(label: string): Promise<TestUser> {
  const email = `${label}-${crypto.randomUUID().slice(0, 8)}@test.tragsape.local`;
  const password = `Lozinka-${crypto.randomUUID()}`;
  const admin = adminClient();
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) {
    throw new Error(`Korisnik nije stvoren: ${error?.message}`);
  }
  createdUsers.push(data.user.id);
  const client = anonClient();
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) {
    throw new Error(`Prijava nije uspjela: ${signIn.error.message}`);
  }
  return { id: data.user.id, email, client };
}

/** Anonimni korisnik: ima sesiju, ali nije potvrdio e-mail. */
export async function createAnonymousUser(): Promise<{ id: string; client: Client }> {
  const client = anonClient();
  const { data, error } = await client.auth.signInAnonymously();
  if (error || !data.user) {
    throw new Error(`Anonimna prijava nije uspjela: ${error?.message}`);
  }
  createdUsers.push(data.user.id);
  return { id: data.user.id, client };
}

/** Briše sve korisnike stvorene u testu; njihovi memorijali nestaju kaskadno. */
export async function cleanupUsers(): Promise<void> {
  const admin = adminClient();
  // Narudžbe čuvaju retke koje kaskada ne smije obrisati, pa idu prve.
  for (const id of createdUsers) {
    const { data: orders } = await admin.from("orders").select("id").eq("user_id", id);
    for (const order of orders ?? []) {
      const { data: lines } = await admin.from("order_lines").select("id").eq("order_id", order.id);
      const lineIds = (lines ?? []).map((line) => line.id);
      if (lineIds.length > 0) {
        await admin.from("donation_entries").delete().in("order_line_id", lineIds);
        await admin.from("gifts").delete().in("order_line_id", lineIds);
        await admin.from("entitlements").delete().in("order_line_id", lineIds);
        await admin.from("gestures").delete().in("order_line_id", lineIds);
      }
      await admin.from("partner_commissions").delete().eq("order_id", order.id);
      await admin.from("orders").delete().eq("id", order.id);
    }
  }
  for (const id of createdUsers.splice(0)) {
    await admin.auth.admin.deleteUser(id);
  }
}

/** Nacrt memorijala s osnovnim podacima, stvoren kao zadani korisnik. */
export async function createDraft(client: Client, name = "Medo"): Promise<string> {
  const { data: id, error } = await client.rpc("create_memorial_draft", {});
  if (error || !id) {
    throw new Error(`Nacrt nije stvoren: ${error?.message}`);
  }
  const update = await client.from("memorials").update({ name, species: "pas" }).eq("id", id);
  if (update.error) {
    throw new Error(`Nacrt nije spremljen: ${update.error.message}`);
  }
  return id;
}
