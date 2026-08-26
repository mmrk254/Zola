import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { requireAuthenticatedUser, resolveActingHospital } from "@/lib/auth";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const context = await requireAuthenticatedUser();
    resolveActingHospital(context, id, ["hospital_admin", "hospital_staff", "clinician"]);
    const { data, error } = await getServiceClient().from("hospitals").select("*").eq("id", id).single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ hospital: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const context = await requireAuthenticatedUser();
    resolveActingHospital(context, id, ["hospital_admin"]);
    const body = await request.json();
    const payload = {
      name: body.name?.trim(),
      address: body.address?.trim() || null,
      contact_info: body.contact_info?.trim() || null,
      alert_phone: body.alert_phone?.trim() || null,
      alert_email: body.alert_email?.trim() || null
    };
    if (!payload.name) return NextResponse.json({ error: "Facility name is required." }, { status: 400 });
    const { data, error } = await getServiceClient().from("hospitals").update(payload).eq("id", id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ hospital: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Unauthorized" }, { status: 401 });
  }
}
