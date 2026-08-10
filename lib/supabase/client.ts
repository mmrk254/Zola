import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// null when env vars aren't set yet, so pages can fall back to demo data
// instead of crashing during setup.
export const supabase = url && anonKey ? createClient(url, anonKey) : null;

export const isSupabaseConfigured = Boolean(url && anonKey);
