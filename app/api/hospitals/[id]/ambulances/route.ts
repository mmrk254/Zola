import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { requireAuthenticatedUser, resolveActingHospital } from "@/lib/auth";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const context = await requireAuthenticatedUser();
    resolveActingHospital(context, id, ["hospital_admin", "hospital_staff", "clinician"]);

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("hospital_ambulances")
      .select("*")
      .eq("hospital_id", id)
      .order("plate_number");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ambulances: data ?? [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const context = await requireAuthenticatedUser();
    resolveActingHospital(context, id, ["hospital_admin"]);

    const body = await request.json();
    const { plate_number, driver_name, driver_phone } = body;

    if (!plate_number?.trim() || !driver_name?.trim()) {
      return NextResponse.json({ error: "Plate number and driver name are required." }, { status: 400 });
    }

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("hospital_ambulances")
      .insert({
        hospital_id: id,
        plate_number: plate_number.trim().toUpperCase(),
        driver_name: driver_name.trim(),
        driver_phone: driver_phone?.trim() || null,
        status: "available"
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ambulance: data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Unauthorized" }, { status: 401 });
  }
}
