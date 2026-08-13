import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { requireAuthenticatedUser, resolveActingHospital, rolesForReferringAction } from "@/lib/auth";
import { transitionReferral } from "@/lib/transition-referral";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const ambulanceId = body.ambulance_id;

  if (!ambulanceId) {
    return NextResponse.json({ error: "Select an available ambulance to dispatch." }, { status: 400 });
  }

  let context;
  try {
    context = await requireAuthenticatedUser();
    resolveActingHospital(context, body.acting_hospital_id, rolesForReferringAction());
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();
  const { data: ambulance, error: ambulanceError } = await supabase
    .from("hospital_ambulances")
    .select("id, hospital_id, plate_number, driver_name, driver_phone, status")
    .eq("id", ambulanceId)
    .single();

  if (ambulanceError || !ambulance) {
    return NextResponse.json({ error: "Ambulance not found." }, { status: 404 });
  }

  if (ambulance.status !== "available") {
    return NextResponse.json({ error: "That ambulance is already dispatched on another case." }, { status: 409 });
  }

  const { data: referral } = await supabase
    .from("referral_cases")
    .select("referring_facility_id, transfer_mode")
    .eq("id", id)
    .single();

  if (!referral || referral.transfer_mode === "internal_onsite") {
    return NextResponse.json({ error: "This referral does not require ambulance dispatch." }, { status: 409 });
  }

  const result = await transitionReferral(
    id,
    "ambulance",
    "ambulance_arranged",
    { ambulance_id: ambulanceId },
    {
      acting_hospital_id: body.acting_hospital_id ?? referral.referring_facility_id,
      notes: `Dispatched ${ambulance.plate_number} · ${ambulance.driver_name}${ambulance.driver_phone ? ` (${ambulance.driver_phone})` : ""}`
    }
  );

  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });

  await supabase
    .from("hospital_ambulances")
    .update({
      status: "dispatched",
      current_referral_id: id,
      updated_at: new Date().toISOString()
    })
    .eq("id", ambulanceId);

  return NextResponse.json({ referral: result.referral, ambulance });
}
