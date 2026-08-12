import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { requireAuthenticatedUser, resolveActingHospital } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const context = await requireAuthenticatedUser();
    const hospitalId = request.nextUrl.searchParams.get("hospital_id");
    const acting = resolveActingHospital(context, hospitalId, ["hospital_admin"]);
    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from("hospital_memberships")
      .select("id, role, status, created_at, users(id, name, email)")
      .eq("hospital_id", acting.hospitalId)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ staff: data ?? [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  let hospitalId: string;
  try {
    const context = await requireAuthenticatedUser();
    const acting = resolveActingHospital(context, body.acting_hospital_id, ["hospital_admin"]);
    hospitalId = acting.hospitalId;
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Unauthorized" }, { status: 401 });
  }

  const { name, email, role, password } = body;

  if (!name || !email || !role || !password) {
    return NextResponse.json({ error: "name, email, role, and password are required." }, { status: 400 });
  }

  if (!["clinician", "hospital_staff", "hospital_admin"].includes(role)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  const supabase = getServiceClient();

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name }
  });

  if (createError || !created.user) {
    return NextResponse.json({ error: createError?.message ?? "Could not create user." }, { status: 500 });
  }

  const userId = created.user.id;

  const { error: profileError } = await supabase.from("users").upsert(
    {
      id: userId,
      name,
      email,
      role,
      network_admin: false
    },
    { onConflict: "id" }
  );

  if (profileError) {
    await supabase.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const { error: membershipError } = await supabase.from("hospital_memberships").insert({
    user_id: userId,
    hospital_id: hospitalId,
    role,
    status: "active"
  });

  if (membershipError) {
    await supabase.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: membershipError.message }, { status: 500 });
  }

  return NextResponse.json(
    { staff: { id: userId, name, email, role, hospital_id: hospitalId } },
    { status: 201 }
  );
}
