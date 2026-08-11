import { createClient } from "@supabase/supabase-js";

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
export const supabase = hasValidConfig ? createClient(url!, anonKey!) : null;

export const isSupabaseConfigured = hasValidConfig;
