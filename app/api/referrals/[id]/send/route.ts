import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { transitionReferral } from "@/lib/transition-referral";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const supabase = getServiceClient();
  const { data: current } = await supabase
    .from("referral_cases")
    .select("referring_facility_id, transfer_mode, receiving_facility_id")
    .eq("id", id)
    .single();

  const extraUpdate: Record<string, unknown> = { receiving_facility_id: null };
  if (current && ["internal_onsite", "internal_offsite"].includes(current.transfer_mode)) {
    extraUpdate.receiving_facility_id = current.receiving_facility_id ?? current.referring_facility_id;
  }

  const result = await transitionReferral(id, "send", "searching", extraUpdate, {
    acting_hospital_id: body.acting_hospital_id
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ referral: result.referral });
}
