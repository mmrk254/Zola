import { getServiceClient } from "@/lib/supabase/server";
import { requireHospitalAccess } from "@/lib/auth";
import { canTransition } from "@/lib/referral-state-machine";
import { ReferralStatus } from "@/lib/types";

export async function transitionReferral(
  id: string,
  action: string,
  toStatus: ReferralStatus,
  extraUpdate: Record<string, unknown> = {}
) {
  const supabase = getServiceClient();

  const { data: current, error: fetchError } = await supabase
    .from("referral_cases")
    .select("status, referring_facility_id, receiving_facility_id")
    .eq("id", id)
    .single();

  if (fetchError || !current) {
    return { error: "Referral not found", status: 404 as const };
  }

  if (!canTransition(action, current.status)) {
    return {
      error: `Cannot ${action} a referral currently in status "${current.status}".`,
      status: 409 as const
    };
  }

  try {
    const hospitalId = current.referring_facility_id ?? current.receiving_facility_id;
    if (hospitalId) {
      await requireHospitalAccess(hospitalId, ["clinician", "hospital_staff", "hospital_admin"]);
    }
  } catch (error: any) {
    return { error: error.message ?? "Unauthorized", status: 401 as const };
  }

  const { data: referral, error } = await supabase
    .from("referral_cases")
    .update({ status: toStatus, updated_at: new Date().toISOString(), ...extraUpdate })
    .eq("id", id)
    .select()
    .single();

  if (error) return { error: error.message, status: 500 as const };

  await supabase.from("referral_events").insert({
    referral_case_id: id,
    from_status: current.status,
    to_status: toStatus,
    facility_id: current.referring_facility_id ?? current.receiving_facility_id ?? null
  });

  return { referral, status: 200 as const };
}
