import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

function isValidSupabaseUrl(value: string | undefined) {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

const hasValidConfig = isValidSupabaseUrl(url) && Boolean(anonKey);

// null when env vars aren't set yet, so pages can fall back to demo data
// instead of crashing during setup.
// The browser client persists the session in cookies so Next.js middleware and
// server routes see the same authenticated user after sign-in.
export const supabase = hasValidConfig ? createBrowserClient(url!, anonKey!) : null;

export const isSupabaseConfigured = hasValidConfig;
