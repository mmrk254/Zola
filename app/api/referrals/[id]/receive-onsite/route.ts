import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { requireAuthenticatedUser, resolveActingHospital, rolesForReferringAction } from "@/lib/auth";
import { transitionReferral } from "@/lib/transition-referral";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const supabase = getServiceClient();
  const { data: current } = await supabase
    .from("referral_cases")
    .select("transfer_mode")
    .eq("id", id)
    .single();

  if (!current || current.transfer_mode !== "internal_onsite") {
    return NextResponse.json({ error: "This referral requires ambulance transport." }, { status: 409 });
  }

  try {
    const context = await requireAuthenticatedUser();
    resolveActingHospital(context, body.acting_hospital_id, rolesForReferringAction());
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Unauthorized" }, { status: 401 });
  }

  const result = await transitionReferral(id, "receive-onsite", "patient_received", {}, {
    acting_hospital_id: body.acting_hospital_id
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ referral: result.referral });
}
