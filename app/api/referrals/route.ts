import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { nextReference } from "@/lib/referral-state-machine";

export async function GET(request: NextRequest) {
  const supabase = getServiceClient();
  const status = request.nextUrl.searchParams.get("status");
  const hospitalId = request.nextUrl.searchParams.get("hospital_id");

  let query = supabase
    .from("referral_cases")
    .select("*, referring:referring_facility_id(name), receiving:receiving_facility_id(name)")
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (hospitalId) query = query.eq("referring_facility_id", hospitalId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ referrals: data });
}

export async function POST(request: NextRequest) {
  const supabase = getServiceClient();
  const body = await request.json();

  const { patient_initials, care_level, urgency, referring_facility_id, clinical_summary } = body;

  if (!patient_initials || !care_level || !referring_facility_id) {
    return NextResponse.json(
      { error: "patient_initials, care_level, and referring_facility_id are required" },
      { status: 400 }
    );
  }

  const { count } = await supabase
    .from("referral_cases")
    .select("id", { count: "exact", head: true });

  const reference = nextReference((count ?? 0) + 1);

  const { data: referral, error } = await supabase
    .from("referral_cases")
    .insert({
      reference,
      patient_initials,
      care_level,
      urgency: urgency ?? "urgent",
      referring_facility_id,
      clinical_summary: clinical_summary ?? null,
      status: "draft"
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase
    .from("referral_events")
    .insert({ referral_case_id: referral.id, from_status: null, to_status: "draft" });

  return NextResponse.json({ referral }, { status: 201 });
}
