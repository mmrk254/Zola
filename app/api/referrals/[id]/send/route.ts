import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { transitionReferral } from "@/lib/transition-referral";
import { sendReferralSms } from "@/lib/sms-alert";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const supabase = getServiceClient();
  const { data: current } = await supabase
    .from("referral_cases")
    .select("referring_facility_id, transfer_mode, receiving_facility_id")
    .eq("id", id)
    .single();

  const extraUpdate: Record<string, unknown> = {};
  if (current && ["internal_onsite", "internal_offsite"].includes(current.transfer_mode)) {
    extraUpdate.receiving_facility_id = current.receiving_facility_id ?? current.referring_facility_id;
  } else if (current?.receiving_facility_id && current.transfer_mode !== "external") {
    extraUpdate.receiving_facility_id = current.receiving_facility_id;
  } else {
    extraUpdate.receiving_facility_id = null;
  }

  const result = await transitionReferral(id, "send", "searching", extraUpdate, {
    acting_hospital_id: body.acting_hospital_id
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });

  const { data: referralDetails } = await supabase
    .from("referral_cases")
    .select("reference, care_level, referring:referring_facility_id(name), receiving:receiving_facility_id(name, alert_phone)")
    .eq("id", id)
    .single();
  const receiver = referralDetails?.receiving as unknown as { name?: string; alert_phone?: string } | null;
  const referring = referralDetails?.referring as unknown as { name?: string } | null;
  if (receiver?.alert_phone) {
    await sendReferralSms(
      receiver.alert_phone,
      `Zola Referrals: ${referring?.name ?? "A hospital"} has sent ${referralDetails?.reference ?? "a referral"} for a ${referralDetails?.care_level ?? "critical care"} bed. Open Zola to review and respond.`
    );
  }
  return NextResponse.json({ referral: result.referral });
}
