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

const PASSWORD = "ZolaTest2026!";

const HOSPITAL_ACCOUNTS = [
  {
    hospitalName: "Kijani County Hospital",
    adminEmail: "admin.kijani@zola.local",
    adminName: "Kijani Admin",
    clinicianEmail: "staff.kijani@zola.local",
    clinicianName: "Kijani Clinician"
  },
  {
    hospitalName: "Riverside Medical Centre",
    adminEmail: "admin.riverside@zola.local",
    adminName: "Riverside Admin",
    clinicianEmail: "staff.riverside@zola.local",
    clinicianName: "Riverside Clinician"
  },
  {
    hospitalName: "Nairobi Central Hospital",
    adminEmail: "admin.nairobi@zola.local",
    adminName: "Nairobi Admin",
    clinicianEmail: "staff.nairobi@zola.local",
    clinicianName: "Nairobi Clinician"
  }
];

async function ensureUser(email, name, role) {
  const { data: listed } = await supabase.auth.admin.listUsers();
  let authUser = listed.users.find((u) => u.email === email);

  if (!authUser) {
    const { data: created, error } = await supabase.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { name }
    });
    if (error) throw error;
    authUser = created.user;
    console.log("Created auth user:", email);
  } else {
    await supabase.auth.admin.updateUserById(authUser.id, { password: PASSWORD });
    console.log("Updated password for:", email);
  }

  const { error: profileError } = await supabase.from("users").upsert(
    {
      id: authUser.id,
      name,
      email,
      role,
      network_admin: false
    },
    { onConflict: "id" }
  );
  if (profileError) throw profileError;

  return authUser.id;
}

async function ensureMembership(userId, hospitalId, role) {
  const { error } = await supabase.from("hospital_memberships").upsert(
    {
      user_id: userId,
      hospital_id: hospitalId,
      role,
      status: "active",
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id,hospital_id" }
  );
  if (error) throw error;
}

async function main() {
  const { data: hospitals, error } = await supabase.from("hospitals").select("id, name").order("name");
  if (error) throw error;

  console.log("\n=== Zola hospital test accounts ===\n");
  console.log(`Password for all accounts: ${PASSWORD}\n`);

  for (const account of HOSPITAL_ACCOUNTS) {
    const hospital = hospitals?.find((h) => h.name === account.hospitalName);
    if (!hospital) {
      console.warn(`Hospital not found, skipping: ${account.hospitalName}`);
      continue;
    }

    const adminId = await ensureUser(account.adminEmail, account.adminName, "hospital_admin");
    await ensureMembership(adminId, hospital.id, "hospital_admin");

    const clinicianId = await ensureUser(account.clinicianEmail, account.clinicianName, "clinician");
    await ensureMembership(clinicianId, hospital.id, "clinician");

    console.log(`${account.hospitalName}`);
    console.log(`  Admin:      ${account.adminEmail}`);
    console.log(`  Clinician:  ${account.clinicianEmail}`);
    console.log(`  Workspace:  /workspace/login`);
    console.log(`  Staff login: /login\n`);
  }

  console.log("Done. Run the workflow migration if you have not already:");
  console.log("  supabase/migrations/202608130002_referral_workflow_ambulances.sql");
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
