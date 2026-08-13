import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import {
  requireAuthenticatedUser,
  resolveActingHospital,
  rolesForReceivingAction
} from "@/lib/auth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";

  if (!reason) {
    return NextResponse.json({ error: "A decline reason is required (e.g. no beds available)." }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { data: current, error: fetchError } = await supabase
    .from("referral_cases")
    .select("id, status, transfer_mode, referring_facility_id, receiving_facility_id")
    .eq("id", id)
    .single();

  if (fetchError || !current) {
    return NextResponse.json({ error: "Referral not found" }, { status: 404 });
  }

  if (current.status !== "searching") {
    return NextResponse.json({ error: "This referral is no longer awaiting a response." }, { status: 409 });
  }

  let context;
  let actorHospitalId: string;
  try {
    context = await requireAuthenticatedUser();
    const receivingId = body.receiving_facility_id ?? body.acting_hospital_id;
    const acting = resolveActingHospital(context, receivingId, rolesForReceivingAction());
    actorHospitalId = acting.hospitalId;
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Unauthorized" }, { status: 401 });
  }

  const isNetworkBroadcast = current.transfer_mode === "external" || !current.receiving_facility_id;

  if (isNetworkBroadcast) {
    const { error: responseError } = await supabase.from("referral_responses").upsert(
      {
        referral_case_id: id,
        hospital_id: actorHospitalId,
        response: "declined",
        reason
      },
      { onConflict: "referral_case_id,hospital_id" }
    );

    if (responseError) return NextResponse.json({ error: responseError.message }, { status: 500 });

    await supabase.from("referral_events").insert({
      referral_case_id: id,
      from_status: "searching",
      to_status: "searching",
      actor_user_id: context.user.id,
      facility_id: actorHospitalId,
      notes: `Declined: ${reason}`
    });

    const { data: referral } = await supabase.from("referral_cases").select("*").eq("id", id).single();
    return NextResponse.json({ referral, declined: true });
  }

  const { data: referral, error } = await supabase
    .from("referral_cases")
    .update({
      status: "ready_to_send",
      receiving_facility_id: null,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .eq("status", "searching")
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!referral) {
    return NextResponse.json({ error: "This referral was already accepted by another hospital." }, { status: 409 });
  }

  await supabase.from("referral_events").insert({
    referral_case_id: id,
    from_status: "searching",
    to_status: "ready_to_send",
    actor_user_id: context.user.id,
    facility_id: actorHospitalId,
    notes: reason
  });

  return NextResponse.json({ referral });
}
