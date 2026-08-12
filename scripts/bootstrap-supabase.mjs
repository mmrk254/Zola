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
  const { data: hospitals, error: hospitalsError } = await supabase
    .from("hospitals")
    .select("id, name")
    .order("created_at", { ascending: true })
    .limit(1);

  if (hospitalsError) throw hospitalsError;
  if (!hospitals?.length) throw new Error("No hospitals found.");

  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) throw authError;

  const adminAuth = authUsers.users.find((user) => user.email === "admin@zola.local");
  if (!adminAuth) throw new Error("admin@zola.local not found in Supabase Auth.");

  const { error: userError } = await supabase.from("users").upsert(
    {
      id: adminAuth.id,
      name: "Zola Network Admin",
      email: "admin@zola.local",
      network_admin: true,
      role: "network_admin"
    },
    { onConflict: "id" }
  );
  if (userError) throw userError;

  const { data: membershipCheck, error: membershipCheckError } = await supabase
    .from("hospital_memberships")
    .select("id")
    .eq("user_id", adminAuth.id)
    .limit(1);

  if (membershipCheckError) {
    console.error(
      "hospital_memberships table is missing. Run supabase/migrations/202608120002_membership_bootstrap.sql in the Supabase SQL editor."
    );
    process.exit(1);
  }

  if (!membershipCheck?.length) {
    const { error: membershipError } = await supabase.from("hospital_memberships").insert({
      user_id: adminAuth.id,
      hospital_id: hospitals[0].id,
      role: "hospital_admin",
      status: "active"
    });
    if (membershipError) throw membershipError;
    console.log("Created admin membership for", hospitals[0].name);
  } else {
    console.log("Admin membership already exists.");
  }

  console.log("Supabase bootstrap complete.");
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
