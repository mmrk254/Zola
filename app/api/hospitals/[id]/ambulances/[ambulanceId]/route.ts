import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { requireAuthenticatedUser, resolveActingHospital } from "@/lib/auth";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; ambulanceId: string }> }) {
  try {
    const { id, ambulanceId } = await params;
    const context = await requireAuthenticatedUser();
    resolveActingHospital(context, id, ["hospital_admin"]);

    const body = await request.json();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.plate_number?.trim()) updates.plate_number = body.plate_number.trim().toUpperCase();
    if (body.driver_name?.trim()) updates.driver_name = body.driver_name.trim();
    if ("driver_phone" in body) updates.driver_phone = body.driver_phone?.trim() || null;

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("hospital_ambulances")
      .update(updates)
      .eq("id", ambulanceId)
      .eq("hospital_id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ambulance: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; ambulanceId: string }> }
) {
  try {
    const { id, ambulanceId } = await params;
    const context = await requireAuthenticatedUser();
    resolveActingHospital(context, id, ["hospital_admin"]);

    const supabase = getServiceClient();
    const { data: ambulance } = await supabase
      .from("hospital_ambulances")
      .select("status")
      .eq("id", ambulanceId)
      .eq("hospital_id", id)
      .single();

    if (!ambulance) return NextResponse.json({ error: "Ambulance not found." }, { status: 404 });
    if (ambulance.status === "dispatched") {
      return NextResponse.json({ error: "Cannot remove an ambulance that is currently dispatched." }, { status: 409 });
    }

    const { error } = await supabase.from("hospital_ambulances").delete().eq("id", ambulanceId).eq("hospital_id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Unauthorized" }, { status: 401 });
  }
}
