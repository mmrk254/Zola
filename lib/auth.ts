import { getAuthenticatedClient, getServiceClient } from "@/lib/supabase/server";

export type MembershipRole = "clinician" | "hospital_staff" | "hospital_admin";

export type ActiveMembership = {
  hospital_id: string;
  hospital_name?: string;
  role: MembershipRole;
  status: "active" | "revoked";
};

export type AuthenticatedUserContext = {
  user: { id: string; email?: string | null; name?: string | null };
  networkAdmin: boolean;
  memberships: ActiveMembership[];
};

const REFERRING_ACTION_ROLES: MembershipRole[] = ["clinician", "hospital_admin"];
const RECEIVING_ACTION_ROLES: MembershipRole[] = ["clinician", "hospital_staff", "hospital_admin"];

export async function getCurrentUserContext(): Promise<AuthenticatedUserContext | null> {
  try {
    const supabase = await getAuthenticatedClient();
    const {
      data: { user },
      error
    } = await supabase.auth.getUser();

    if (error || !user) return null;

    const service = getServiceClient();
    const { data: profile, error: profileError } = await service
      .from("users")
      .select("name, email, network_admin, role, hospital_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile) return null;

    const { data: membershipRows } = await service
      .from("hospital_memberships")
      .select("hospital_id, role, status, hospitals(name)")
      .eq("user_id", user.id)
      .eq("status", "active");

    if (membershipRows?.length) {
      return {
        user: { id: user.id, email: user.email, name: profile.name },
        networkAdmin: Boolean(profile.network_admin),
        memberships: membershipRows.map((row: any) => ({
          hospital_id: row.hospital_id,
          hospital_name: row.hospitals?.name,
          role: row.role,
          status: row.status
        }))
      };
    }

    const legacyRole = profile.role as MembershipRole | "network_admin" | "admin" | null;
    const networkAdmin =
      Boolean(profile.network_admin) || legacyRole === "network_admin" || legacyRole === "admin";

    if (networkAdmin) {
      return {
        user: { id: user.id, email: user.email, name: profile.name },
        networkAdmin: true,
        memberships: []
      };
    }

    if (profile.hospital_id && legacyRole && REFERRING_ACTION_ROLES.includes(legacyRole as MembershipRole)) {
      const { data: hospital } = await service
        .from("hospitals")
        .select("name")
        .eq("id", profile.hospital_id)
        .maybeSingle();

      return {
        user: { id: user.id, email: user.email, name: profile.name },
        networkAdmin: false,
        memberships: [
          {
            hospital_id: profile.hospital_id,
            hospital_name: hospital?.name,
            role: legacyRole as MembershipRole,
            status: "active"
          }
        ]
      };
    }

    if (profile.hospital_id && legacyRole === "hospital_staff") {
      const { data: hospital } = await service
        .from("hospitals")
        .select("name")
        .eq("id", profile.hospital_id)
        .maybeSingle();

      return {
        user: { id: user.id, email: user.email, name: profile.name },
        networkAdmin: false,
        memberships: [
          {
            hospital_id: profile.hospital_id,
            hospital_name: hospital?.name,
            role: "hospital_staff",
            status: "active"
          }
        ]
      };
    }

    return {
      user: { id: user.id, email: user.email, name: profile.name },
      networkAdmin,
      memberships: []
    };
  } catch {
    return null;
  }
}

export async function requireAuthenticatedUser(): Promise<AuthenticatedUserContext> {
  const context = await getCurrentUserContext();
  if (!context) throw new Error("Authentication required.");
  return context;
}

export function getAccessibleHospitalIds(context: AuthenticatedUserContext): string[] {
  return context.memberships.filter((m) => m.status === "active").map((m) => m.hospital_id);
}

export function resolveActingHospital(
  context: AuthenticatedUserContext,
  requestedHospitalId: string | null | undefined,
  allowedRoles: MembershipRole[]
): { hospitalId: string; membership: ActiveMembership } {
  if (context.networkAdmin) {
    if (requestedHospitalId) {
      return {
        hospitalId: requestedHospitalId,
        membership: {
          hospital_id: requestedHospitalId,
          role: "hospital_admin",
          status: "active"
        }
      };
    }
    throw new Error("Select which facility you are acting for.");
  }

  const eligible = context.memberships.filter(
    (m) => m.status === "active" && allowedRoles.includes(m.role)
  );

  if (!eligible.length) {
    throw new Error("You do not have permission for this action.");
  }

  if (requestedHospitalId) {
    const match = eligible.find((m) => m.hospital_id === requestedHospitalId);
    if (!match) throw new Error("You do not have access to this hospital.");
    return { hospitalId: requestedHospitalId, membership: match };
  }

  if (eligible.length === 1) {
    return { hospitalId: eligible[0].hospital_id, membership: eligible[0] };
  }

  throw new Error("Select which facility you are acting for.");
}

export function canAccessReferral(
  context: AuthenticatedUserContext,
  referral: { referring_facility_id: string; receiving_facility_id: string | null; status?: string }
): boolean {
  if (context.networkAdmin) return true;
  const ids = getAccessibleHospitalIds(context);
  if (ids.includes(referral.referring_facility_id)) return true;
  if (referral.receiving_facility_id && ids.includes(referral.receiving_facility_id)) return true;
  if (referral.status === "searching") return ids.length > 0;
  return false;
}

export function rolesForReferringAction(): MembershipRole[] {
  return REFERRING_ACTION_ROLES;
}

export function rolesForReceivingAction(): MembershipRole[] {
  return RECEIVING_ACTION_ROLES;
}

export async function requireHospitalAccess(
  hospitalId: string,
  allowedRoles: MembershipRole[] = ["clinician", "hospital_staff", "hospital_admin"]
) {
  const context = await requireAuthenticatedUser();
  if (context.networkAdmin) return context;

  if (!hospitalId) {
    if (context.memberships.some((m) => m.status === "active" && allowedRoles.includes(m.role))) {
      return context;
    }
    throw new Error("You do not have access to this hospital.");
  }

  const match = context.memberships.some(
    (membership) =>
      membership.hospital_id === hospitalId &&
      membership.status === "active" &&
      allowedRoles.includes(membership.role)
  );

  if (!match) throw new Error("You do not have access to this hospital.");
  return context;
}
