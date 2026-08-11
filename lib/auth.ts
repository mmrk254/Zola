import { getAuthenticatedClient, getServiceClient } from "@/lib/supabase/server";

export type ActiveMembership = {
  hospital_id: string;
  role: "clinician" | "hospital_staff" | "hospital_admin";
  status: "active" | "revoked";
};

export type AuthenticatedUserContext = {
  user: { id: string; email?: string | null; };
  networkAdmin: boolean;
  memberships: ActiveMembership[];
};

export async function getCurrentUserContext(): Promise<AuthenticatedUserContext | null> {
  try {
    const supabase = await getAuthenticatedClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) return null;

    const service = getServiceClient();
    const { data: modernProfile, error: modernProfileError } = await service
      .from("users")
      .select("network_admin")
      .eq("id", user.id)
      .maybeSingle();

    // The existing production project predates hospital_memberships and uses
    // users.role/users.hospital_id. Support both layouts while it is migrated.
    if (modernProfileError) {
      const { data: legacyProfile, error: legacyProfileError } = await service
        .from("users")
        .select("role, hospital_id")
        .eq("id", user.id)
        .maybeSingle();

      if (legacyProfileError || !legacyProfile) return null;

      const legacyRole = legacyProfile.role as ActiveMembership["role"] | "network_admin" | "admin";
      const networkAdmin = legacyRole === "network_admin" || legacyRole === "admin";
      const memberships: ActiveMembership[] = legacyProfile.hospital_id && !networkAdmin
        ? [{ hospital_id: legacyProfile.hospital_id, role: legacyRole as ActiveMembership["role"], status: "active" }]
        : [];

      return {
        user: { id: user.id, email: user.email },
        networkAdmin,
        memberships
      };
    }

    const { data: memberships } = await service
      .from("hospital_memberships")
      .select("hospital_id, role, status")
      .eq("user_id", user.id)
      .eq("status", "active");

    return {
      user: { id: user.id, email: user.email },
      networkAdmin: Boolean(modernProfile?.network_admin),
      memberships: (memberships ?? []) as ActiveMembership[]
    };
  } catch {
    return null;
  }
}

export async function requireAuthenticatedUser(): Promise<AuthenticatedUserContext> {
  const context = await getCurrentUserContext();

  if (!context) {
    throw new Error("Authentication required.");
  }

  return context;
}

export async function requireHospitalAccess(
  hospitalId: string,
  allowedRoles: Array<ActiveMembership["role"]> = ["clinician", "hospital_staff", "hospital_admin"]
) {
  const context = await requireAuthenticatedUser();

  if (context.networkAdmin) return context;

  const match = context.memberships.some(
    (membership) =>
      membership.hospital_id === hospitalId &&
      membership.status === "active" &&
      allowedRoles.includes(membership.role)
  );

  if (!match) {
    throw new Error("You do not have access to this hospital.");
  }

  return context;
}
