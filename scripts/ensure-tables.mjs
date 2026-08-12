import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.split("=").map((part) => part.trim()))
    .filter((parts) => parts.length === 2)
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function main() {
  const { error } = await supabase.from("hospital_applications").select("id").limit(1);
  if (!error) {
    console.log("hospital_applications table already exists.");
    return;
  }

  console.log(
    "Run supabase/migrations/202608120003_hospital_applications.sql in the Supabase SQL editor to enable hospital registration."
  );
}

main();
