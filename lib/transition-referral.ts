import { getServiceClient } from "@/lib/supabase/server";
import {
  AuthenticatedUserContext,
  resolveActingHospital,
  rolesForReceivingAction,
  rolesForReferringAction,
  requireAuthenticatedUser
} from "@/lib/auth";
import { canTransition } from "@/lib/referral-state-machine";
import { ReferralStatus } from "@/lib/types";

type TransitionOptions = {
  acting_hospital_id?: string;
  receiving_facility_id?: string;
};

function hospitalForAction(
  action: string,
  current: { referring_facility_id: string; receiving_facility_id: string | null },
  options: TransitionOptions
) {
  if (action === "accept" || action === "decline") {
    return options.receiving_facility_id ?? current.receiving_facility_id ?? options.acting_hospital_id;
  }
  return current.referring_facility_id;
}

function rolesForAction(action: string) {
  if (action === "accept" || action === "decline") return rolesForReceivingAction();
  return rolesForReferringAction();
}

export async function transitionReferral(
  id: string,
  action: string,
  toStatus: ReferralStatus,
  extraUpdate: Record<string, unknown> = {},
  options: TransitionOptions = {}
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

  let context: AuthenticatedUserContext;
  let actorHospitalId: string | null = null;

  try {
    context = await requireAuthenticatedUser();
    const hospitalId = hospitalForAction(action, current, options);
    if (!hospitalId) {
      return { error: "A receiving facility is required for this action.", status: 400 as const };
    }
    const acting = resolveActingHospital(context, options.acting_hospital_id ?? hospitalId, rolesForAction(action));
    actorHospitalId = acting.hospitalId;
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
    actor_user_id: context.user.id,
    facility_id: actorHospitalId
  });

  return { referral, status: 200 as const };
}
