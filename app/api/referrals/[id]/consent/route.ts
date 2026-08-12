import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { requireAuthenticatedUser, resolveActingHospital, rolesForReferringAction } from "@/lib/auth";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServiceClient();
  const body = await request.json();

  let context;
  let actorHospitalId: string;

  try {
    context = await requireAuthenticatedUser();
    const acting = resolveActingHospital(context, body.acting_hospital_id, rolesForReferringAction());
    actorHospitalId = acting.hospitalId;
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Unauthorized" }, { status: 401 });
  }

  const checks: boolean[] = body.checks ?? [];
  const allConfirmed = checks.length === 4 && checks.every(Boolean);

  if (!allConfirmed) {
    return NextResponse.json(
      { error: "All four consent checks must be confirmed before a referral can be sent." },
      { status: 400 }
    );
  }

  const { data: current } = await supabase
    .from("referral_cases")
    .select("status, referring_facility_id")
    .eq("id", id)
    .single();

  if (!current || !["draft", "consent_pending"].includes(current.status)) {
    return NextResponse.json({ error: "Referral is not awaiting consent." }, { status: 409 });
  }

  if (current.referring_facility_id !== actorHospitalId && !context!.networkAdmin) {
    return NextResponse.json({ error: "You do not have access to this referral." }, { status: 403 });
  }

  const { data: referral, error } = await supabase
    .from("referral_cases")
    .update({ status: "ready_to_send", consent_obtained: true, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("referral_events").insert({
    referral_case_id: id,
    from_status: current.status,
    to_status: "ready_to_send",
    actor_user_id: context!.user.id,
    facility_id: actorHospitalId
  });

  return NextResponse.json({ referral });
}
