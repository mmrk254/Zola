/**
 * Seeds real small Nairobi-area hospitals with geolocation, bed capacity,
 * admin/clinician accounts, and ambulances.
 *
 * Usage: node scripts/seed-demo-hospitals.mjs
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 *
 * Run supabase/migrations/202608180001_hospital_geolocation.sql first if geo columns are missing.
 */

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const idx = line.indexOf("=");
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    })
    .filter(([key, value]) => key && value)
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const PASSWORD = "Zola2026!@";

const HOSPITALS = [
  {
    slug: "southb",
    name: "South B Hospital",
    type: "both",
    address: "Hospital Road, South B, Nairobi",
    latitude: -1.3134,
    longitude: 36.8382,
    contact_info: "+254 20 690 3000",
    adminName: "Grace Wanjiru",
    clinicianName: "Dr. Peter Kamau",
    capacity: { ICU: 2, HDU: 4, NICU: 1 }
  },
  {
    slug: "nairobiwest",
    name: "Nairobi West Hospital",
    type: "both",
    address: "Gandhi Avenue, Nairobi West, Nairobi",
    latitude: -1.3042,
    longitude: 36.8078,
    contact_info: "+254 20 600 8000",
    adminName: "James Otieno",
    clinicianName: "Dr. Anne Muthoni",
    capacity: { ICU: 3, HDU: 5, NICU: 2 }
  },
  {
    slug: "avenueparklands",
    name: "Avenue Hospital Parklands",
    type: "both",
    address: "1st Avenue, Parklands, Nairobi",
    latitude: -1.2628,
    longitude: 36.8156,
    contact_info: "+254 20 374 7500",
    adminName: "Mary Njeri",
    clinicianName: "Dr. David Kiprono",
    capacity: { ICU: 2, HDU: 3, NICU: 2 }
  },
  {
    slug: "jamii",
    name: "Jamii Hospital",
    type: "referring",
    address: "Eastleigh, Nairobi",
    latitude: -1.2835,
    longitude: 36.8475,
    contact_info: "+254 20 676 0000",
    adminName: "Hassan Abdi",
    clinicianName: "Dr. Fatima Ali",
    capacity: { ICU: 1, HDU: 3, NICU: 1 }
  },
  {
    slug: "ruaraka",
    name: "Ruaraka Uhai Neema Hospital",
    type: "both",
    address: "Ruaraka, Nairobi",
    latitude: -1.2385,
    longitude: 36.8768,
    contact_info: "+254 20 444 0000",
    adminName: "Lucy Chebet",
    clinicianName: "Dr. Samuel Ochieng",
    capacity: { ICU: 2, HDU: 4, NICU: 0 }
  },
  {
    slug: "meridian",
    name: "Meridian Equator Hospital",
    type: "receiving",
    address: "Kasarani, Nairobi",
    latitude: -1.2195,
    longitude: 36.894,
    contact_info: "+254 20 802 0000",
    adminName: "John Mwangi",
    clinicianName: "Dr. Ruth Wambui",
    capacity: { ICU: 3, HDU: 6, NICU: 2 }
  },
  {
    slug: "scholastica",
    name: "St. Scholastica Uzima Hospital",
    type: "referring",
    address: "South C, Nairobi",
    latitude: -1.315,
    longitude: 36.828,
    contact_info: "+254 20 600 5000",
    adminName: "Sister Agnes Wanjala",
    clinicianName: "Dr. Michael Oduor",
    capacity: { ICU: 1, HDU: 2, NICU: 1 }
  },
  {
    slug: "ladygrace",
    name: "Lady Grace Hospital",
    type: "both",
    address: "Embakasi, Nairobi",
    latitude: -1.318,
    longitude: 36.892,
    contact_info: "+254 20 822 0000",
    adminName: "Patricia Akinyi",
    clinicianName: "Dr. Brian Mutua",
    capacity: { ICU: 2, HDU: 3, NICU: 2 }
  }
];

function mapHospitalType(type) {
  if (type === "receiving") return "receiving";
  return "referring";
}

async function findAuthUser(email) {
  let page = 1;
  while (page <= 10) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (data.users.length < 200) break;
    page += 1;
  }
  return null;
}

async function ensureUser(email, name, role) {
  let authUser = await findAuthUser(email);

  if (!authUser) {
    const { data: created, error } = await supabase.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { name }
    });
    if (error) throw error;
    authUser = created.user;
    console.log("  Created user:", email);
  } else {
    const { error } = await supabase.auth.admin.updateUserById(authUser.id, { password: PASSWORD });
    if (error) throw error;
    console.log("  Updated password:", email);
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

async function ensureHospital(def) {
  const { data: existing } = await supabase.from("hospitals").select("id").eq("name", def.name).maybeSingle();

  const payload = {
    name: def.name,
    type: mapHospitalType(def.type),
    contact_info: def.contact_info,
    address: def.address,
    latitude: def.latitude,
    longitude: def.longitude
  };

  if (existing) {
    const { data, error } = await supabase.from("hospitals").update(payload).eq("id", existing.id).select("id").single();
    if (error) {
      if (error.message?.includes("address") || error.message?.includes("latitude")) {
        const { data: fallback, error: fallbackError } = await supabase
          .from("hospitals")
          .update({ name: def.name, type: mapHospitalType(def.type), contact_info: def.contact_info })
          .eq("id", existing.id)
          .select("id")
          .single();
        if (fallbackError) throw fallbackError;
        console.warn(`  Geo columns missing for ${def.name} — run geolocation migration.`);
        return fallback.id;
      }
      throw error;
    }
    console.log("  Updated hospital:", def.name);
    return data.id;
  }

  const { data, error } = await supabase.from("hospitals").insert(payload).select("id").single();
  if (error) {
    if (error.message?.includes("address") || error.message?.includes("latitude")) {
      const { data: fallback, error: fallbackError } = await supabase
        .from("hospitals")
        .insert({ name: def.name, type: mapHospitalType(def.type), contact_info: def.contact_info })
        .select("id")
        .single();
      if (fallbackError) throw fallbackError;
      console.warn(`  Geo columns missing for ${def.name} — run geolocation migration.`);
      return fallback.id;
    }
    throw error;
  }
  console.log("  Created hospital:", def.name);
  return data.id;
}

async function ensureCapacity(hospitalId, capacity) {
  for (const [careLevel, beds] of Object.entries(capacity)) {
    const facility_status = beds > 0 ? "open" : "at_capacity";
    const { error } = await supabase.from("hospital_capacity").upsert(
      {
        hospital_id: hospitalId,
        care_level: careLevel,
        available_beds: beds,
        facility_status,
        updated_at: new Date().toISOString()
      },
      { onConflict: "hospital_id,care_level" }
    );
    if (error) throw error;
  }
}

async function ensureAmbulances(hospitalId, slug) {
  const prefix = slug.slice(0, 3).toUpperCase();
  const fleet = [
    { plate_number: `K${prefix}01A`, driver_name: "Driver One", driver_phone: "+254700000001" },
    { plate_number: `K${prefix}02B`, driver_name: "Driver Two", driver_phone: "+254700000002" }
  ];

  for (const unit of fleet) {
    const { error } = await supabase.from("hospital_ambulances").upsert(
      { hospital_id: hospitalId, ...unit, status: "available" },
      { onConflict: "hospital_id,plate_number" }
    );
    if (error && !error.message?.includes("hospital_ambulances")) throw error;
  }
}

async function main() {
  console.log("\n=== Zola demo hospitals seed ===\n");
  console.log(`Password for all accounts: ${PASSWORD}\n`);

  const summary = [];

  for (const def of HOSPITALS) {
    console.log(def.name);
    const hospitalId = await ensureHospital(def);
    await ensureCapacity(hospitalId, def.capacity);
    await ensureAmbulances(hospitalId, def.slug);

    const adminEmail = `admin.${def.slug}@zola.health`;
    const clinicianEmail = `staff.${def.slug}@zola.health`;

    const adminId = await ensureUser(adminEmail, def.adminName, "hospital_admin");
    await ensureMembership(adminId, hospitalId, "hospital_admin");

    const clinicianId = await ensureUser(clinicianEmail, def.clinicianName, "clinician");
    await ensureMembership(clinicianId, hospitalId, "clinician");

    summary.push({
      hospital: def.name,
      address: def.address,
      admin: adminEmail,
      clinician: clinicianEmail,
      beds: def.capacity
    });
    console.log("");
  }

  console.log("=== Login credentials ===\n");
  for (const row of summary) {
    console.log(`${row.hospital}`);
    console.log(`  Address:   ${row.address}`);
    console.log(`  Beds:      ICU ${row.beds.ICU} · HDU ${row.beds.HDU} · NICU ${row.beds.NICU}`);
    console.log(`  Admin:     ${row.admin}`);
    console.log(`  Clinician: ${row.clinician}`);
    console.log(`  Password:  ${PASSWORD}`);
    console.log("");
  }

  console.log("Hospital workspace: /workspace/login");
  console.log("Staff sign-in:      /login");
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
