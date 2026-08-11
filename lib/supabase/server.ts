import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createAuthServerClient } from "@/lib/supabase/auth-helpers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

function isValidSupabaseUrl(value: string | undefined) {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Server-only client, used exclusively inside app/api routes.
 * Uses the service role key, which bypasses row-level security,
 * so it must never be imported into any file that ships to the browser.
 */
export function getServiceClient() {
  if (!isValidSupabaseUrl(url) || !serviceRoleKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  return createClient(url!, serviceRoleKey, {
    auth: { persistSession: false }
  });
}

export async function getAuthenticatedClient() {
  if (!isValidSupabaseUrl(url) || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Supabase auth is not configured.");
  }

  return createAuthServerClient();
}
