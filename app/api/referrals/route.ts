import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { nextReference } from "@/lib/referral-state-machine";
import {
  getAccessibleHospitalIds,
  requireAuthenticatedUser,
  resolveActingHospital,
  rolesForReferringAction
} from "@/lib/auth";

export async function GET(request: NextRequest) {
  let context;
  try {
    context = await requireAuthenticatedUser();
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();
  const status = request.nextUrl.searchParams.get("status");
  const view = request.nextUrl.searchParams.get("view");
  const hospitalId = request.nextUrl.searchParams.get("hospital_id");

  let query = supabase
    .from("referral_cases")
    .select("*, referring:referring_facility_id(name), receiving:receiving_facility_id(name)")
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  if (context.networkAdmin) {
    if (hospitalId) query = query.eq("referring_facility_id", hospitalId);
  } else {
    const hospitalIds = getAccessibleHospitalIds(context);
    if (!hospitalIds.length) {
      return NextResponse.json({ referrals: [] });
    }

    if (view === "inbox") {
      const inboxHospital = hospitalId && hospitalIds.includes(hospitalId) ? hospitalId : hospitalIds[0];
      query = query.eq("status", "searching");
      query = query.or(
        `receiving_facility_id.eq.${inboxHospital},and(receiving_facility_id.is.null,referring_facility_id.neq.${inboxHospital})`
      );

      const { data, error } = await query;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      const { data: declinedRows } = await supabase
        .from("referral_responses")
        .select("referral_case_id")
        .eq("hospital_id", inboxHospital);

      const declinedIds = new Set((declinedRows ?? []).map((row) => row.referral_case_id));
      const referrals = (data ?? []).filter((row) => !declinedIds.has(row.id));
      return NextResponse.json({ referrals });
    } else if (hospitalId) {
      if (!hospitalIds.includes(hospitalId)) {
        return NextResponse.json({ error: "You do not have access to this hospital." }, { status: 403 });
      }
      query = query.or(
        `referring_facility_id.eq.${hospitalId},receiving_facility_id.eq.${hospitalId}`
      );
    } else {
      const filter = hospitalIds.map((id) => `referring_facility_id.eq.${id}`).join(",");
      const receiveFilter = hospitalIds.map((id) => `receiving_facility_id.eq.${id}`).join(",");
      query = query.or(`${filter},${receiveFilter}`);
    }
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ referrals: data });
}

export async function POST(request: NextRequest) {
  let context;
  let actingHospitalId: string;
  const body = await request.json();

  try {
    context = await requireAuthenticatedUser();
    const acting = resolveActingHospital(
      context,
      body.acting_hospital_id ?? body.referring_facility_id,
      rolesForReferringAction()
    );
    actingHospitalId = acting.hospitalId;
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();

  const { patient_initials, care_level, urgency, clinical_summary, transfer_mode, patient_location } = body;

  if (!patient_initials || !care_level) {
    return NextResponse.json(
      { error: "patient_initials and care_level are required" },
      { status: 400 }
    );
  }

  const { count } = await supabase.from("referral_cases").select("id", { count: "exact", head: true });

  const reference = nextReference((count ?? 0) + 1);

  const mode = ["external", "internal_onsite", "internal_offsite"].includes(transfer_mode)
    ? transfer_mode
    : "external";

  if (mode === "internal_offsite" && !patient_location?.trim()) {
    return NextResponse.json({ error: "Patient location is required for off-site internal referrals." }, { status: 400 });
  }

  const receivingOnCreate = ["internal_onsite", "internal_offsite"].includes(mode) ? actingHospitalId : null;

  const { data: referral, error } = await supabase
    .from("referral_cases")
    .insert({
      reference,
      patient_initials,
      care_level,
      urgency: urgency ?? "urgent",
      referring_facility_id: actingHospitalId,
      receiving_facility_id: receivingOnCreate,
      clinical_summary: clinical_summary ?? null,
      transfer_mode: mode,
      patient_location: mode === "internal_offsite" ? patient_location.trim() : null,
      status: "draft",
      created_by: context!.user.id
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("referral_events").insert({
    referral_case_id: referral.id,
    from_status: null,
    to_status: "draft",
    actor_user_id: context!.user.id,
    facility_id: actingHospitalId
  });

  return NextResponse.json({ referral }, { status: 201 });
}
