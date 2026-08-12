import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";

function mapHospitalType(type: string) {
  if (type === "receiving") return "receiving";
  if (type === "both") return "referring";
  return "referring";
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { hospital_name, admin_name, admin_email, phone, hospital_type, password, confirm_password } = body;

  if (!hospital_name || !admin_name || !admin_email || !phone || !password) {
    return NextResponse.json({ error: "All fields including password are required." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  if (password !== confirm_password) {
    return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
  }

  const supabase = getServiceClient();

  const { data: existingUser } = await supabase.from("users").select("id").eq("email", admin_email).maybeSingle();
  if (existingUser) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const { data: hospital, error: hospitalError } = await supabase
    .from("hospitals")
    .insert({ name: hospital_name, type: mapHospitalType(hospital_type ?? "referring") })
    .select()
    .single();

  if (hospitalError) {
    return NextResponse.json({ error: hospitalError.message }, { status: 500 });
  }

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: admin_email,
    password,
    email_confirm: true,
    user_metadata: { name: admin_name }
  });

  if (createError || !created.user) {
    await supabase.from("hospitals").delete().eq("id", hospital.id);
    return NextResponse.json({ error: createError?.message ?? "Could not create admin account." }, { status: 500 });
  }

  const userId = created.user.id;

  const { error: profileError } = await supabase.from("users").insert({
    id: userId,
    name: admin_name,
    email: admin_email,
    phone,
    role: "hospital_admin",
    network_admin: false
  });

  if (profileError) {
    await supabase.auth.admin.deleteUser(userId);
    await supabase.from("hospitals").delete().eq("id", hospital.id);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const { error: membershipError } = await supabase.from("hospital_memberships").insert({
    user_id: userId,
    hospital_id: hospital.id,
    role: "hospital_admin",
    status: "active"
  });

  if (membershipError) {
    await supabase.auth.admin.deleteUser(userId);
    await supabase.from("hospitals").delete().eq("id", hospital.id);
    return NextResponse.json({ error: membershipError.message }, { status: 500 });
  }

  await supabase.from("hospital_applications").insert({
    hospital_name,
    admin_name,
    admin_email,
    phone,
    hospital_type: hospital_type ?? "referring",
    status: "approved"
  });

  return NextResponse.json({ ok: true, hospital_id: hospital.id }, { status: 201 });
}
