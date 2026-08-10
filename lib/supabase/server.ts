import "server-only";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Server-only client, used exclusively inside app/api routes.
 * Uses the service role key, which bypasses row-level security,
 * so it must never be imported into any file that ships to the browser.
 */
export function getServiceClient() {
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false }
  });
}
